import { createClient, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const USER_EMAIL = process.env.TEST_USER_EMAIL;
const USER_PASSWORD = process.env.TEST_USER_PASSWORD;

/** Suites that write data run only when admin credentials are in .env.test. */
export const hasAdmin = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
/** Optional authenticated account that is NOT in public.admins. */
export const hasUser = Boolean(USER_EMAIL && USER_PASSWORD);

/** Same key as the SPA and the landing: every call is bound by RLS. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedIn(email: string, password: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign in failed for ${email}: ${error.message}`);
  return client;
}

export const adminClient = () => signedIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
export const userClient = () => signedIn(USER_EMAIL!, USER_PASSWORD!);

export const RUN_ID = Math.random().toString(36).slice(2, 10);

// High range, far from real official numbers, so fixtures never collide with content.
const NUMBER_BASE = 900_000_000 + Math.floor(Math.random() * 90_000_000);
let numberOffset = 0;
export const testNumber = () => NUMBER_BASE + numberOffset++;

/** `.invalid` is a reserved TLD: these addresses can never receive mail. */
export const testEmail = (label: string) => `apitest-${RUN_ID}-${label}@example.invalid`;

export type OptionInput = { id?: string; text: string; is_correct: boolean };

export function questionPayload(overrides: Record<string, unknown> = {}) {
  return {
    official_number: testNumber(),
    text: `API test ${RUN_ID}`,
    image_id: null,
    is_free: false,
    options: [
      { text: "Giusta", is_correct: true },
      { text: "Sbagliata 1", is_correct: false },
      { text: "Sbagliata 2", is_correct: false },
    ] as OptionInput[],
    mnemonic: null as { text: string | null; image_id: string | null } | null,
    ...overrides,
  };
}

/** First existing category, or a throwaway one (returned in `created` for cleanup). */
export async function ensureCategory(admin: SupabaseClient) {
  const { data, error } = await admin.from("categories").select("id").limit(1);
  if (error) throw new Error(error.message);
  if (data.length > 0) return { id: data[0].id as string, created: false };

  const inserted = await admin
    .from("categories")
    .insert({ name: `API test ${RUN_ID}` })
    .select("id")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return { id: inserted.data.id as string, created: true };
}

/** Calls the send-newsletter Edge Function and returns the HTTP outcome instead of throwing. */
export async function invokeSend(client: SupabaseClient, body: unknown) {
  const { data, error } = await client.functions.invoke("send-newsletter", {
    body: body as Record<string, unknown>,
  });
  if (!error) return { status: 200, body: data };
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    return { status: response.status, body: await response.json().catch(() => null) };
  }
  throw error;
}
