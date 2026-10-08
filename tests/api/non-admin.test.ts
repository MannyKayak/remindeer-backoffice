// An authenticated account that is not in public.admins: reads content, writes nothing.
// Needs TEST_USER_* in .env.test. Writes nothing.
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { hasUser, invokeSend, questionPayload, userClient } from "./helpers";

describe.skipIf(!hasUser)("non-admin authenticated user", () => {
  let user: SupabaseClient;
  const UNKNOWN_ID = crypto.randomUUID();

  beforeAll(async () => {
    user = await userClient();
  });

  it("is not an admin", async () => {
    const { data, error } = await user.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("reads content tables", async () => {
    for (const table of ["categories", "questions", "question_options", "mnemonics", "images"]) {
      const { error } = await user.from(table).select("id").limit(1);
      expect(error, table).toBeNull();
    }
  });

  it.each(["audit_log", "email_signups", "newsletters", "newsletter_recipients"])(
    "gets no rows from %s",
    async (table) => {
      const { data, error } = await user.from(table).select("*");
      expect(error !== null || data!.length === 0).toBe(true);
    },
  );

  it("cannot save a question", async () => {
    const { data: categories } = await user.from("categories").select("id").limit(1);
    const { error } = await user.rpc("save_question", {
      payload: questionPayload({ category_id: categories?.[0]?.id ?? UNKNOWN_ID }),
    });
    expect(error?.code).toBe("42501");
  });

  it("cannot write content tables directly", async () => {
    const insert = await user.from("categories").insert({ name: "non-admin must not write" });
    expect(insert.error).not.toBeNull();

    // Rewrites a question with its own text: harmless even if the policy were broken.
    const { data: questions } = await user.from("questions").select("id, text").limit(1);
    if (!questions?.length) return;
    const update = await user
      .from("questions")
      .update({ text: questions[0].text })
      .eq("id", questions[0].id)
      .select("id");
    expect(update.error !== null || update.data!.length === 0).toBe(true);
  });

  it("cannot save or send a newsletter", async () => {
    const { error } = await user.rpc("save_newsletter", {
      payload: { subject: "x", body: "x", signup_ids: [UNKNOWN_ID] },
    });
    expect(error?.code).toBe("42501");

    const { status } = await invokeSend(user, { newsletter_id: UNKNOWN_ID });
    expect(status).toBe(403);
  });
});
