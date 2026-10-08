// Landing signup, subscriber management, save_newsletter and the send-newsletter guards.
// Needs TEST_ADMIN_* in .env.test; fixtures are deleted at the end.
// Never calls send-newsletter with an existing newsletter id: no mail is sent.
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, hasAdmin, invokeSend, RUN_ID, testEmail } from "./helpers";

describe.skipIf(!hasAdmin)("newsletter API (admin)", () => {
  const anon = anonClient();
  let admin: SupabaseClient;
  const emails = ["a", "b", "c"].map(testEmail);
  let signups: Record<string, string>; // email -> id
  const newsletterIds: string[] = [];

  async function save(payload: Record<string, unknown>) {
    const result = await admin.rpc("save_newsletter", { payload });
    if (!result.error && !payload.id) newsletterIds.push(result.data as string);
    return result;
  }

  async function recipients(newsletterId: string) {
    const { data, error } = await admin
      .from("newsletter_recipients")
      .select("id, signup_id, email, delivery_status")
      .eq("newsletter_id", newsletterId);
    if (error) throw new Error(error.message);
    return data;
  }

  // What the landing form sends: email plus the consent proof.
  const signup = (email: string) => ({ email, source: "landing", consent_text_version: "apitest" });

  const draft = (signupEmails: string[], overrides: Record<string, unknown> = {}) => ({
    subject: `API test ${RUN_ID}`,
    body: "Corpo di prova",
    signup_ids: signupEmails.map((e) => signups[e]),
    ...overrides,
  });

  beforeAll(async () => {
    admin = await adminClient();

    // The landing form path: role anon, email and consent proof columns only.
    for (const email of emails) {
      const { error } = await anon.from("email_signups").insert(signup(email));
      if (error) throw new Error(`anon signup failed: ${error.message}`);
    }
    const { data, error } = await admin.from("email_signups").select("id, email").in("email", emails);
    if (error) throw new Error(error.message);
    signups = Object.fromEntries(data.map((s) => [s.email, s.id]));
  });

  afterAll(async () => {
    if (!admin) return;
    if (newsletterIds.length) await admin.from("newsletters").delete().in("id", newsletterIds);
    await admin.from("email_signups").delete().like("email", `apitest-${RUN_ID}-%`);
  });

  describe("landing signup (anon)", () => {
    it("stores the emails sent by the form", () => {
      expect(Object.keys(signups).sort()).toEqual([...emails].sort());
    });

    it("refuses an email that is not lowercase and trimmed", async () => {
      const upper = await anon.from("email_signups").insert(signup(testEmail("UPPER")));
      expect(upper.error).not.toBeNull();

      const padded = await anon.from("email_signups").insert(signup(` ${testEmail("pad")}`));
      expect(padded.error).not.toBeNull();
    });

    it("refuses a duplicate email", async () => {
      const { error } = await anon.from("email_signups").insert(signup(emails[0]));
      expect(error?.code).toBe("23505");
    });

    it("stores the consent proof with a database-set timestamp", async () => {
      const { data, error } = await admin
        .from("email_signups")
        .select("source, consent_text_version, consent_given_at")
        .eq("id", signups[emails[0]])
        .single();
      expect(error).toBeNull();
      expect(data).toMatchObject({ source: "landing", consent_text_version: "apitest" });
      expect(Math.abs(Date.now() - new Date(data!.consent_given_at).getTime())).toBeLessThan(5 * 60_000);
    });

    it("refuses a signup without consent proof", async () => {
      const bare = await anon.from("email_signups").insert({ email: testEmail("bare") });
      expect(bare.error?.code).toBe("42501");

      const noVersion = await anon.from("email_signups").insert({ email: testEmail("nover"), source: "landing" });
      expect(noVersion.error?.code).toBe("42501");

      const noSource = await anon
        .from("email_signups")
        .insert({ email: testEmail("nosrc"), consent_text_version: "apitest" });
      expect(noSource.error?.code).toBe("42501");
    });

    it("refuses an unknown source or a blank consent text version", async () => {
      const source = await anon.from("email_signups").insert({ ...signup(testEmail("src")), source: "other" });
      expect(source.error?.code).toBe("23514");

      const blank = await anon
        .from("email_signups")
        .insert({ ...signup(testEmail("blank")), consent_text_version: " " });
      expect(blank.error?.code).toBe("23514");
    });

    it("cannot choose the consent timestamp", async () => {
      const { error } = await anon
        .from("email_signups")
        .insert({ ...signup(testEmail("backdated")), consent_given_at: "2020-01-01T00:00:00Z" });
      expect(error?.code).toBe("42501");
    });

    it("cannot set other columns, read, update or delete", async () => {
      const withId = await anon
        .from("email_signups")
        .insert({ id: crypto.randomUUID(), ...signup(testEmail("withid")) });
      expect(withId.error?.code).toBe("42501");

      const read = await anon.from("email_signups").select("email");
      expect(read.error?.code).toBe("42501");

      const update = await anon.from("email_signups").update({ email: testEmail("x") }).eq("email", emails[0]);
      expect(update.error?.code).toBe("42501");

      const remove = await anon.from("email_signups").delete().eq("email", emails[0]);
      expect(remove.error?.code).toBe("42501");
    });
  });

  describe("subscribers (admin)", () => {
    it("cannot add a subscriber by hand", async () => {
      const { error } = await admin.from("email_signups").insert({ email: testEmail("manual") });
      expect(error).not.toBeNull();
    });

    it("can correct an email, but not to an invalid one", async () => {
      const fixed = testEmail("c-fixed");
      const ok = await admin.from("email_signups").update({ email: fixed }).eq("id", signups[emails[2]]);
      expect(ok.error).toBeNull();

      const bad = await admin.from("email_signups").update({ email: "non-una-mail" }).eq("id", signups[emails[2]]);
      expect(bad.error?.code).toBe("23514");

      const back = await admin.from("email_signups").update({ email: emails[2] }).eq("id", signups[emails[2]]);
      expect(back.error).toBeNull();
    });
  });

  describe("save_newsletter", () => {
    it("creates a draft with exactly the selected recipients", async () => {
      const { data: id, error } = await save(draft([emails[0], emails[1]]));
      expect(error).toBeNull();

      const { data: newsletter } = await admin
        .from("newsletters")
        .select("status, sent_at, subject")
        .eq("id", id)
        .single();
      expect(newsletter).toEqual({ status: "draft", sent_at: null, subject: `API test ${RUN_ID}` });

      const rows = await recipients(id);
      expect(rows.map((r) => r.email).sort()).toEqual([emails[0], emails[1]].sort());
      expect(rows.every((r) => r.delivery_status === "pending")).toBe(true);
    });

    it("replaces the recipient set on update", async () => {
      const { data: id } = await save(draft([emails[0], emails[1]]));
      const { error } = await save(draft([emails[1], emails[2]], { id, subject: "Oggetto nuovo" }));
      expect(error).toBeNull();

      const rows = await recipients(id);
      expect(rows.map((r) => r.email).sort()).toEqual([emails[1], emails[2]].sort());

      const { data } = await admin.from("newsletters").select("subject").eq("id", id).single();
      expect(data!.subject).toBe("Oggetto nuovo");
    });

    it("ignores duplicate recipient ids", async () => {
      const { data: id, error } = await save(draft([emails[0], emails[0]]));
      expect(error).toBeNull();
      expect(await recipients(id)).toHaveLength(1);
    });

    it("rejects a newsletter without recipients", async () => {
      const { error } = await save(draft([]));
      expect(error?.code).toBe("22023");
    });

    it("rejects a subscriber that does not exist and saves nothing", async () => {
      const subject = `API test ${RUN_ID} fantasma`;
      const { error } = await save({
        subject,
        body: "Corpo",
        signup_ids: [signups[emails[0]], crypto.randomUUID()],
      });
      expect(error?.code).toBe("22023");

      const { data } = await admin.from("newsletters").select("id").eq("subject", subject);
      expect(data).toEqual([]);
    });

    it("rejects an empty subject or body", async () => {
      const noSubject = await save(draft([emails[0]], { subject: "  " }));
      expect(noSubject.error?.code).toBe("23514");

      const noBody = await save(draft([emails[0]], { body: "" }));
      expect(noBody.error?.code).toBe("23514");
    });

    it("rejects an unknown newsletter id", async () => {
      const { error } = await save(draft([emails[0]], { id: crypto.randomUUID() }));
      expect(error?.code).toBe("P0002");
    });
  });

  describe("send state is not writable by admins", () => {
    it("cannot mark a newsletter as sending or sent", async () => {
      const { data: id } = await save(draft([emails[0]]));

      const sending = await admin.from("newsletters").update({ status: "sending" }).eq("id", id);
      expect(sending.error).not.toBeNull();

      const sent = await admin
        .from("newsletters")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
      expect(sent.error).not.toBeNull();

      const { data } = await admin.from("newsletters").select("status").eq("id", id).single();
      expect(data!.status).toBe("draft");
    });

    it("cannot change a recipient's delivery status or address", async () => {
      const { data: id } = await save(draft([emails[0]]));
      await admin
        .from("newsletter_recipients")
        .update({ delivery_status: "sent", email: "altro@example.invalid" })
        .eq("newsletter_id", id);

      const rows = await recipients(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ delivery_status: "pending", email: emails[0] });
    });
  });

  describe("deleting", () => {
    it("a deleted subscriber leaves the drafts", async () => {
      const gone = testEmail("gone");
      await anon.from("email_signups").insert(signup(gone));
      const { data: signup } = await admin.from("email_signups").select("id").eq("email", gone).single();

      const { data: id } = await save({
        subject: `API test ${RUN_ID}`,
        body: "Corpo",
        signup_ids: [signups[emails[0]], signup!.id],
      });
      expect(await recipients(id)).toHaveLength(2);

      const { error } = await admin.from("email_signups").delete().eq("id", signup!.id);
      expect(error).toBeNull();

      const rows = await recipients(id);
      expect(rows.map((r) => r.email)).toEqual([emails[0]]);
    });

    it("a draft is deleted together with its recipients", async () => {
      const { data: id } = await save(draft([emails[0], emails[1]]));
      const { error } = await admin.from("newsletters").delete().eq("id", id);
      expect(error).toBeNull();
      expect(await recipients(id)).toEqual([]);
    });
  });

  describe("send-newsletter guards", () => {
    it("rejects a malformed newsletter id", async () => {
      const { status } = await invokeSend(admin, { newsletter_id: "non-un-uuid" });
      expect(status).toBe(400);
    });

    it("rejects a newsletter that does not exist", async () => {
      const send = await invokeSend(admin, { newsletter_id: crypto.randomUUID() });
      expect(send.status).toBe(409);

      const retry = await invokeSend(admin, { newsletter_id: crypto.randomUUID(), retry: true });
      expect(retry.status).toBe(409);
    });
  });
});
