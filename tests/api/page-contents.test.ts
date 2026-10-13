// Page contents as seen by the landing (role anon): one JSON document per page
// through get_page_content(), no access to the table. Read-only: writes nothing.
import { describe, expect, it } from "vitest";
import { anonClient } from "./helpers";

const anon = anonClient();
const UNKNOWN_ID = crypto.randomUUID();

describe("anon: get_page_content", () => {
  it("returns the home page document", async () => {
    const { data, error } = await anon.rpc("get_page_content", { p_slug: "home" });
    expect(error).toBeNull();
    expect(typeof data.title).toBe("string");
    expect(typeof data.subtitle).toBe("string");
    expect(typeof data.cta.label).toBe("string");
    expect(Array.isArray(data.stats)).toBe(true);
    expect(data.hero_image === null || typeof data.hero_image.path === "string").toBe(true);
    expect(typeof data.updated_at).toBe("string");
  });

  it("returns null for an unknown page", async () => {
    const { data, error } = await anon.rpc("get_page_content", { p_slug: "does-not-exist" });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});

describe("anon: page_contents table", () => {
  it("cannot read the table", async () => {
    const { data, error } = await anon.from("page_contents").select("*");
    expect(error !== null || data!.length === 0).toBe(true);
  });

  it("cannot update or delete", async () => {
    const update = await anon.from("page_contents").update({ content: {} }).eq("id", UNKNOWN_ID);
    expect(update.error?.code).toBe("42501");

    const remove = await anon.from("page_contents").delete().eq("id", UNKNOWN_ID);
    expect(remove.error?.code).toBe("42501");
  });

  it("cannot upload to page-images", async () => {
    const file = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    const { error } = await anon.storage.from("page-images").upload(`${UNKNOWN_ID}.png`, file);
    expect(error).not.toBeNull();
  });
});
