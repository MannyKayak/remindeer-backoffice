// send-newsletter: delivers a newsletter via Resend to exactly its stored recipients.
// Spec: _bmad-output/specs/spec-newsletter/ (CAP-9, CAP-10, CAP-11; data-model.md "Send lifecycle")
//
// POST { newsletter_id: uuid, retry?: boolean }
//   retry = false: draft -> sending -> sent; sends every recipient row.
//   retry = true : sent newsletter; resends only rows with delivery_status = 'failed'.
//
// Guarantees:
// - Recipients come only from newsletter_recipients rows of this newsletter.
// - One message per recipient, alone in `to`.
// - Each row is claimed atomically by one invocation (status / delivery_status
//   conditional updates), plus a deterministic Resend Idempotency-Key per batch,
//   so a double click or concurrent call never delivers twice.
// - A recipient whose subscriber was deleted after selection is not sent to.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const BATCH_SIZE = 100; // Resend batch limit
const BATCH_PAUSE_MS = 600; // stay under Resend default rate limit (2 req/s)
const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_FROM = "Remindeer <newsletter@remindeer.it>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Recipient = { id: string; email: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json(500, { error: "RESEND_API_KEY not configured" });
  const from = Deno.env.get("NEWSLETTER_FROM") ?? DEFAULT_FROM;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Caller must be an admin (checked with the caller's own JWT).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin");
  if (adminError || isAdmin !== true) return json(403, { error: "Only admins can send newsletters" });

  let newsletterId: string;
  let retry: boolean;
  try {
    const body = await req.json();
    newsletterId = String(body?.newsletter_id ?? "");
    retry = body?.retry === true;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  if (!/^[0-9a-f-]{36}$/i.test(newsletterId)) return json(400, { error: "Invalid newsletter_id" });

  // Service role: status transitions and delivery results are not writable by admins (RLS).
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // 1. Claim atomically.
  let newsletter: { id: string; subject: string; body: string };
  if (!retry) {
    const { data, error } = await admin
      .from("newsletters")
      .update({ status: "sending" })
      .eq("id", newsletterId)
      .eq("status", "draft")
      .select("id, subject, body")
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!data) return json(409, { error: "Newsletter not found or already sent" });
    newsletter = data;
  } else {
    const { data, error } = await admin
      .from("newsletters")
      .select("id, subject, body")
      .eq("id", newsletterId)
      .eq("status", "sent")
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!data) return json(409, { error: "Only sent newsletters can be retried" });
    newsletter = data;

    const { data: claimed, error: claimError } = await admin
      .from("newsletter_recipients")
      .update({ delivery_status: "pending", error: null })
      .eq("newsletter_id", newsletterId)
      .eq("delivery_status", "failed")
      .not("signup_id", "is", null)
      .select("id");
    if (claimError) return json(500, { error: claimError.message });
    if (!claimed?.length) return json(409, { error: "No failed recipients to retry" });
  }

  // 2. Collect pending rows, refresh email from the subscriber (it may have been corrected).
  const { data: rows, error: rowsError } = await admin
    .from("newsletter_recipients")
    .select("id, email, signup_id, email_signups(email)")
    .eq("newsletter_id", newsletterId)
    .eq("delivery_status", "pending");
  if (rowsError) return json(500, { error: rowsError.message });

  const recipients: Recipient[] = [];
  for (const row of rows ?? []) {
    // deno-lint-ignore no-explicit-any
    const current = (row as any).email_signups?.email as string | undefined;
    if (!row.signup_id || !current) {
      await markFailed(admin, [row.id], "Iscritto eliminato");
      continue;
    }
    if (current !== row.email) {
      const { error } = await admin.from("newsletter_recipients").update({ email: current }).eq("id", row.id);
      if (error) {
        await markFailed(admin, [row.id], error.message);
        continue;
      }
    }
    recipients.push({ id: row.id, email: current });
  }

  // 3. Send in batches, one message per recipient.
  let sent = 0;
  let failed = (rows?.length ?? 0) - recipients.length;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const idempotencyKey =
      "newsletter-" + (await sha256Hex(newsletterId + ":" + chunk.map((r) => r.id).sort().join(",")));
    const payload = chunk.map((r) => ({
      from,
      to: [r.email],
      subject: newsletter.subject,
      text: newsletter.body,
    }));

    const result = await sendBatch(resendKey, idempotencyKey, payload);
    if (result.ok) {
      const { error } = await admin
        .from("newsletter_recipients")
        .update({ delivery_status: "sent", delivered_at: new Date().toISOString(), error: null })
        .in("id", chunk.map((r) => r.id));
      if (error) console.error("send-newsletter: delivered but status update failed", error.message);
      sent += chunk.length;
    } else {
      await markFailed(admin, chunk.map((r) => r.id), result.error);
      failed += chunk.length;
    }

    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_PAUSE_MS);
  }

  // 4. Close the send (retry keeps the original sent_at).
  if (!retry) {
    const { error } = await admin
      .from("newsletters")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", newsletterId)
      .eq("status", "sending");
    if (error) return json(500, { error: error.message, sent, failed });
  }

  return json(200, { sent, failed });
});

async function markFailed(admin: SupabaseClient, ids: string[], message: string) {
  const { error } = await admin
    .from("newsletter_recipients")
    .update({ delivery_status: "failed", error: message.slice(0, 255) })
    .in("id", ids);
  if (error) console.error("send-newsletter: could not mark failed", error.message);
}

async function sendBatch(
  apiKey: string,
  idempotencyKey: string,
  payload: unknown[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(RESEND_BATCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return { ok: false, error: `Network error: ${(e as Error).message}` };
    }

    if (res.ok) return { ok: true };
    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    const text = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${text}` };
  }
}
