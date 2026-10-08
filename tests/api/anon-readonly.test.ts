// What a landing visitor (role anon, publishable key) can and cannot do.
// Read-only: needs no test account and writes nothing.
import { describe, expect, it } from "vitest";
import { anonClient, invokeSend } from "./helpers";

const anon = anonClient();
const UNKNOWN_ID = crypto.randomUUID();

describe("anon: content visibility", () => {
  it("reads only free questions", async () => {
    const { data, error } = await anon.from("questions").select("id, is_free");
    expect(error).toBeNull();
    expect(data!.every((q) => q.is_free === true)).toBe(true);
  });

  it("reads options only of free questions", async () => {
    const options = await anon.from("question_options").select("id, question_id, text, position");
    expect(options.error).toBeNull();

    const questions = await anon.from("questions").select("id");
    const visible = new Set(questions.data!.map((q) => q.id));
    expect(options.data!.every((o) => visible.has(o.question_id))).toBe(true);
  });

  it("cannot read which option is correct", async () => {
    const column = await anon.from("question_options").select("is_correct");
    expect(column.error?.code).toBe("42501");

    const star = await anon.from("question_options").select("*");
    expect(star.error?.code).toBe("42501");
  });

  it("reads categories", async () => {
    const { error } = await anon.from("categories").select("id, name");
    expect(error).toBeNull();
  });
});

describe("anon: private tables", () => {
  it.each(["audit_log", "admins", "email_signups", "newsletters", "newsletter_recipients"])(
    "gets no rows from %s",
    async (table) => {
      const { data, error } = await anon.from(table).select("*");
      expect(error !== null || data!.length === 0).toBe(true);
    },
  );
});

describe("anon: writes and admin functions are refused", () => {
  it("cannot insert a question", async () => {
    const { error } = await anon.from("questions").insert({
      official_number: 999_999_999,
      text: "anon must not write",
      category_id: UNKNOWN_ID,
    });
    expect(error).not.toBeNull();
  });

  it("cannot update or delete questions", async () => {
    // Aimed at an id that does not exist: the privilege check fails before any row is matched.
    const update = await anon.from("questions").update({ text: "anon must not write" }).eq("id", UNKNOWN_ID);
    expect(update.error?.code).toBe("42501");

    const remove = await anon.from("questions").delete().eq("id", UNKNOWN_ID);
    expect(remove.error?.code).toBe("42501");
  });

  it.each([
    ["save_question", { payload: {} }],
    ["save_newsletter", { payload: {} }],
    ["is_admin", {}],
  ])("cannot call %s", async (fn, args) => {
    const { error } = await anon.rpc(fn, args);
    expect(error).not.toBeNull();
  });

  it("cannot call send-newsletter", async () => {
    const { status } = await invokeSend(anon, { newsletter_id: UNKNOWN_ID });
    expect([401, 403]).toContain(status);
  });
});

describe("anon: check_answer", () => {
  it("refuses an unknown (or premium) question", async () => {
    const { error } = await anon.rpc("check_answer", {
      p_question_id: UNKNOWN_ID,
      p_option_id: UNKNOWN_ID,
    });
    expect(error?.code).toBe("P0002");
  });

  it("refuses an option of another question", async () => {
    const { data: questions } = await anon.from("questions").select("id").limit(1);
    if (!questions?.length) return; // no free question in the database yet

    const { error } = await anon.rpc("check_answer", {
      p_question_id: questions[0].id,
      p_option_id: UNKNOWN_ID,
    });
    expect(error?.code).toBe("22023");
  });
});
