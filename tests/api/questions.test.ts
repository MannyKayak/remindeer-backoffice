// save_question, audit log, and what the landing sees of the saved questions.
// Needs TEST_ADMIN_* in .env.test; fixtures are deleted at the end.
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, ensureCategory, hasAdmin, questionPayload, RUN_ID } from "./helpers";

const BUCKET = "question-images";
// 1x1 transparent PNG.
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

type OptionRow = { id: string; text: string; is_correct: boolean; position: number };

describe.skipIf(!hasAdmin)("questions API (admin)", () => {
  const anon = anonClient();
  let admin: SupabaseClient;
  let adminId: string;
  let category: { id: string; created: boolean };
  const questionIds: string[] = [];
  const images: { id: string; path: string }[] = [];

  const payload = (overrides: Record<string, unknown> = {}) =>
    questionPayload({ category_id: category.id, ...overrides });

  async function save(overrides: Record<string, unknown> = {}) {
    const body = payload(overrides);
    const { data, error } = await admin.rpc("save_question", { payload: body });
    if (error) throw new Error(error.message);
    questionIds.push(data as string);
    return { id: data as string, body };
  }

  async function options(questionId: string): Promise<OptionRow[]> {
    const { data, error } = await admin
      .from("question_options")
      .select("id, text, is_correct, position")
      .eq("question_id", questionId)
      .order("position");
    if (error) throw new Error(error.message);
    return data as OptionRow[];
  }

  async function auditRows(table: string, recordIds: string[]) {
    const { data, error } = await admin
      .from("audit_log")
      .select("action, actor_id, record_id, old_data, new_data")
      .eq("table_name", table)
      .in("record_id", recordIds)
      .order("id");
    if (error) throw new Error(error.message);
    return data;
  }

  async function uploadImage(label: string) {
    const path = `apitest-${RUN_ID}-${label}.png`;
    const upload = await admin.storage
      .from(BUCKET)
      .upload(path, new Blob([PNG], { type: "image/png" }), { contentType: "image/png" });
    if (upload.error) throw new Error(upload.error.message);

    const { data, error } = await admin
      .from("images")
      .insert({ storage_path: path, file_name: `${label}.png`, mime_type: "image/png", size_bytes: PNG.length })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    images.push({ id: data.id, path });
    return { id: data.id as string, path };
  }

  beforeAll(async () => {
    admin = await adminClient();
    adminId = (await admin.auth.getUser()).data.user!.id;
    category = await ensureCategory(admin);
  });

  afterAll(async () => {
    if (!admin) return;
    if (questionIds.length) await admin.from("questions").delete().in("id", questionIds);
    if (images.length) {
      await admin.from("images").delete().in("id", images.map((i) => i.id));
      await admin.storage.from(BUCKET).remove(images.map((i) => i.path));
    }
    if (category?.created) await admin.from("categories").delete().eq("id", category.id);
  });

  it("is_admin is true for the test admin", async () => {
    const { data, error } = await admin.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  describe("save_question: create", () => {
    it("stores question, ordered options and mnemonic", async () => {
      const { id, body } = await save({ mnemonic: { text: "  Ricorda così  ", image_id: null } });

      const { data: question } = await admin
        .from("questions")
        .select("official_number, text, is_free, category_id, mnemonics(text)")
        .eq("id", id)
        .single();
      expect(question).toMatchObject({
        official_number: body.official_number,
        text: body.text,
        is_free: false,
        category_id: category.id,
      });
      expect([question!.mnemonics].flat()[0]).toMatchObject({ text: "Ricorda così" });

      const rows = await options(id);
      expect(rows.map((o) => [o.position, o.text, o.is_correct])).toEqual([
        [1, "Giusta", true],
        [2, "Sbagliata 1", false],
        [3, "Sbagliata 2", false],
      ]);
    });

    it.each([
      ["one option", [{ text: "Sola", is_correct: true }]],
      ["eleven options", Array.from({ length: 11 }, (_, i) => ({ text: `Opzione ${i}`, is_correct: i === 0 }))],
      ["no correct option", [{ text: "A", is_correct: false }, { text: "B", is_correct: false }]],
      ["two correct options", [{ text: "A", is_correct: true }, { text: "B", is_correct: true }]],
    ])("rejects %s", async (_label, badOptions) => {
      const body = payload({ options: badOptions });
      const { error } = await admin.rpc("save_question", { payload: body });
      expect(error?.code).toBe("22023");

      const { data } = await admin.from("questions").select("id").eq("official_number", body.official_number);
      expect(data).toEqual([]);
    });

    it("rejects a duplicate official number", async () => {
      const { body } = await save();
      const { error } = await admin.rpc("save_question", {
        payload: payload({ official_number: body.official_number }),
      });
      expect(error?.code).toBe("23505");
    });

    it("rejects an empty text and a text over 500 characters", async () => {
      const empty = await admin.rpc("save_question", { payload: payload({ text: "   " }) });
      expect(empty.error?.code).toBe("23514");

      const long = await admin.rpc("save_question", { payload: payload({ text: "x".repeat(501) }) });
      expect(long.error?.code).toBe("22001");
    });

    it("rejects a mnemonic with neither text nor image", async () => {
      const body = payload({ mnemonic: { text: "  ", image_id: null } });
      const { error } = await admin.rpc("save_question", { payload: body });
      expect(error?.code).toBe("23514");

      // Atomic: the question insert is rolled back with it.
      const { data } = await admin.from("questions").select("id").eq("official_number", body.official_number);
      expect(data).toEqual([]);
    });
  });

  describe("save_question: update", () => {
    it("moves the correct answer, drops and adds options, removes the mnemonic", async () => {
      const { id, body } = await save({ mnemonic: { text: "Da togliere", image_id: null } });
      const [right, wrong1] = await options(id);

      const { error } = await admin.rpc("save_question", {
        payload: {
          ...body,
          id,
          text: `API test ${RUN_ID} modificata`,
          is_free: true,
          options: [
            { id: wrong1.id, text: "Ora giusta", is_correct: true },
            { id: right.id, text: "Ora sbagliata", is_correct: false },
            { text: "Nuova", is_correct: false },
          ],
          mnemonic: null,
        },
      });
      expect(error).toBeNull();

      const rows = await options(id);
      expect(rows.map((o) => [o.position, o.text, o.is_correct])).toEqual([
        [1, "Ora giusta", true],
        [2, "Ora sbagliata", false],
        [3, "Nuova", false],
      ]);
      expect(rows[0].id).toBe(wrong1.id);
      expect(rows[1].id).toBe(right.id);

      const { data: question } = await admin
        .from("questions")
        .select("text, is_free, mnemonics(id)")
        .eq("id", id)
        .single();
      expect(question!.text).toBe(`API test ${RUN_ID} modificata`);
      expect(question!.is_free).toBe(true);
      expect([question!.mnemonics].flat().filter(Boolean)).toEqual([]);
    });

    it("rejects an unknown question id", async () => {
      const { error } = await admin.rpc("save_question", { payload: payload({ id: crypto.randomUUID() }) });
      expect(error?.code).toBe("P0002");
    });

    it("rejects an option of another question and changes nothing", async () => {
      const first = await save();
      const second = await save();
      const [foreign] = await options(second.id);

      const { error } = await admin.rpc("save_question", {
        payload: {
          ...first.body,
          id: first.id,
          text: "Non deve restare",
          options: [
            { id: foreign.id, text: "Rubata", is_correct: true },
            { text: "Altra", is_correct: false },
          ],
        },
      });
      expect(error?.code).toBe("22023");

      const { data } = await admin.from("questions").select("text").eq("id", first.id).single();
      expect(data!.text).toBe(first.body.text);
      expect(await options(first.id)).toHaveLength(3);
      expect((await options(second.id))[0].text).toBe("Giusta");
    });
  });

  describe("delete", () => {
    it("removes options and mnemonic with the question", async () => {
      const { id } = await save({ mnemonic: { text: "Sparisce", image_id: null } });
      const { error } = await admin.from("questions").delete().eq("id", id);
      expect(error).toBeNull();

      expect(await options(id)).toEqual([]);
      const { data } = await admin.from("mnemonics").select("id").eq("question_id", id);
      expect(data).toEqual([]);
    });
  });

  describe("audit log", () => {
    it("records insert, update and delete with the acting admin", async () => {
      const { id, body } = await save();
      await admin.rpc("save_question", {
        payload: { ...body, id, text: "Testo cambiato", options: await options(id) },
      });
      await admin.from("questions").delete().eq("id", id);

      const rows = await auditRows("questions", [id]);
      expect(rows.map((r) => r.action)).toEqual(["insert", "update", "delete"]);
      expect(rows.every((r) => r.actor_id === adminId)).toBe(true);
      expect(rows[1].old_data.text).toBe(body.text);
      expect(rows[1].new_data.text).toBe("Testo cambiato");
      expect(rows[2].old_data.text).toBe("Testo cambiato");
    });

    it("records the old and new correct answer", async () => {
      const { id, body } = await save();
      const [right, wrong] = await options(id);
      await admin.rpc("save_question", {
        payload: {
          ...body,
          id,
          options: [
            { id: right.id, text: right.text, is_correct: false },
            { id: wrong.id, text: wrong.text, is_correct: true },
          ],
        },
      });

      const updates = (await auditRows("question_options", [right.id, wrong.id])).filter(
        (r) => r.action === "update",
      );
      const byId = Object.fromEntries(updates.map((r) => [r.record_id, r]));
      expect(byId[right.id].old_data.is_correct).toBe(true);
      expect(byId[right.id].new_data.is_correct).toBe(false);
      expect(byId[wrong.id].new_data.is_correct).toBe(true);
    });

    it("writes nothing when a save changes nothing", async () => {
      const { id, body } = await save();
      const current = await options(id);
      const ids = [id, ...current.map((o) => o.id)];
      const count = async () =>
        (await auditRows("questions", ids)).length + (await auditRows("question_options", ids)).length;

      const before = await count();
      const { error } = await admin.rpc("save_question", { payload: { ...body, id, options: current } });
      expect(error).toBeNull();
      expect(await count()).toBe(before);
    });
  });

  describe("landing visibility of saved questions", () => {
    let free: { id: string; options: OptionRow[]; image: { id: string; path: string } };
    let premium: { id: string; options: OptionRow[]; image: { id: string; path: string } };

    beforeAll(async () => {
      const freeImage = await uploadImage("free");
      const premiumImage = await uploadImage("premium");
      const freeQ = await save({ is_free: true, image_id: freeImage.id });
      const premiumQ = await save({ is_free: false, image_id: premiumImage.id });
      free = { id: freeQ.id, options: await options(freeQ.id), image: freeImage };
      premium = { id: premiumQ.id, options: await options(premiumQ.id), image: premiumImage };
    });

    it("anon sees the free question and not the premium one", async () => {
      const { data, error } = await anon.from("questions").select("id").in("id", [free.id, premium.id]);
      expect(error).toBeNull();
      expect(data!.map((q) => q.id)).toEqual([free.id]);
    });

    it("anon sees the free question's options and none of the premium one", async () => {
      const { data, error } = await anon
        .from("question_options")
        .select("id, question_id")
        .in("question_id", [free.id, premium.id]);
      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(data!.every((o) => o.question_id === free.id)).toBe(true);
    });

    it("check_answer tells right from wrong on a free question", async () => {
      const correct = free.options.find((o) => o.is_correct)!;
      const wrong = free.options.find((o) => !o.is_correct)!;

      const right = await anon.rpc("check_answer", { p_question_id: free.id, p_option_id: correct.id });
      expect(right.data).toEqual([{ is_correct: true, correct_option_id: correct.id }]);

      const miss = await anon.rpc("check_answer", { p_question_id: free.id, p_option_id: wrong.id });
      expect(miss.data).toEqual([{ is_correct: false, correct_option_id: correct.id }]);
    });

    it("check_answer refuses a premium question to anon but not to an admin", async () => {
      const option = premium.options[0];
      const asAnon = await anon.rpc("check_answer", { p_question_id: premium.id, p_option_id: option.id });
      expect(asAnon.error?.code).toBe("P0002");

      const asAdmin = await admin.rpc("check_answer", { p_question_id: premium.id, p_option_id: option.id });
      expect(asAdmin.error).toBeNull();
    });

    it("anon can open the image of a free question only", async () => {
      const visible = await anon.storage.from(BUCKET).createSignedUrl(free.image.path, 60);
      expect(visible.error).toBeNull();
      expect(visible.data?.signedUrl).toBeTruthy();

      const hidden = await anon.storage.from(BUCKET).createSignedUrl(premium.image.path, 60);
      expect(hidden.error).not.toBeNull();

      const rows = await anon.from("images").select("id").in("id", [free.image.id, premium.image.id]);
      expect(rows.data!.map((i) => i.id)).toEqual([free.image.id]);
    });

    it("anon cannot upload to the image bucket", async () => {
      const { error } = await anon.storage
        .from(BUCKET)
        .upload(`apitest-${RUN_ID}-anon.png`, new Blob([PNG], { type: "image/png" }));
      expect(error).not.toBeNull();
    });
  });
});
