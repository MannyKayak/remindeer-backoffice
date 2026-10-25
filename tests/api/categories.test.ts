// Categories CRUD rules enforced by the database: case-insensitive unique name,
// rename keeps question links, delete refused while a question uses the category.
// Needs TEST_ADMIN_* in .env.test and migration 20261025120000; fixtures are deleted at the end.
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, hasAdmin, questionPayload, RUN_ID } from "./helpers";

describe.skipIf(!hasAdmin)("categories API (admin)", () => {
  let admin: SupabaseClient;
  const categoryIds: string[] = [];
  const questionIds: string[] = [];

  async function createCategory(name: string) {
    const { data, error } = await admin.from("categories").insert({ name }).select("id").single();
    if (error) throw new Error(error.message);
    categoryIds.push(data.id);
    return data.id as string;
  }

  beforeAll(async () => {
    admin = await adminClient();
  });

  afterAll(async () => {
    if (!admin) return;
    if (questionIds.length) await admin.from("questions").delete().in("id", questionIds);
    if (categoryIds.length) await admin.from("categories").delete().in("id", categoryIds);
  });

  it("refuses a name differing only by case or surrounding spaces", async () => {
    const name = `API Test Cat ${RUN_ID}`;
    await createCategory(name);

    const { data, error } = await admin
      .from("categories")
      .insert({ name: `  ${name.toLowerCase()} ` })
      .select("id");
    if (data?.length) categoryIds.push(data[0].id);
    expect(error?.code).toBe("23505");
  });

  it("keeps question links on rename and refuses delete while used", async () => {
    const categoryId = await createCategory(`API Rename ${RUN_ID}`);
    const saved = await admin.rpc("save_question", {
      payload: questionPayload({ category_id: categoryId }),
    });
    expect(saved.error).toBeNull();
    questionIds.push(saved.data as string);

    const renamed = `API Renamed ${RUN_ID}`;
    const update = await admin.from("categories").update({ name: renamed }).eq("id", categoryId);
    expect(update.error).toBeNull();

    const question = await admin
      .from("questions")
      .select("category_id, categories(name)")
      .eq("id", saved.data as string)
      .single();
    expect(question.data?.category_id).toBe(categoryId);
    expect(question.data?.categories).toEqual({ name: renamed });

    const counted = await admin
      .from("categories")
      .select("id, questions(count)")
      .eq("id", categoryId)
      .single();
    expect(counted.data?.questions).toEqual([{ count: 1 }]);

    const refused = await admin.from("categories").delete().eq("id", categoryId);
    expect(refused.error?.code).toBe("23503");
  });

  it("deletes an unused category", async () => {
    const categoryId = await createCategory(`API Unused ${RUN_ID}`);
    const { error } = await admin.from("categories").delete().eq("id", categoryId);
    expect(error).toBeNull();

    const { data } = await admin.from("categories").select("id").eq("id", categoryId);
    expect(data).toEqual([]);
  });
});

describe("categories API (anon)", () => {
  it("cannot create a category", async () => {
    // Returning the row would need select rights on it; anon can read categories, so a leak shows up here.
    const { data, error } = await anonClient()
      .from("categories")
      .insert({ name: `API anon ${RUN_ID}` })
      .select("id");
    if (data?.length && hasAdmin) {
      await (await adminClient()).from("categories").delete().eq("id", data[0].id);
    }
    expect(error).not.toBeNull();
  });
});
