import { describe, it, expect, beforeEach, vi } from "vitest";
import { createFakeKv, type FakeKv } from "@/__tests__/fakeKv";

let kv: FakeKv;

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv("KV_REST_API_URL", "http://fake");
  vi.stubEnv("KV_REST_API_TOKEN", "fake");
  kv = createFakeKv();
  vi.doMock("@vercel/kv", () => ({ createClient: () => kv }));
});

describe("resellersDb (static + KV overlay)", () => {
  it("getReseller falls back to the static config when KV is empty", async () => {
    const { getReseller } = await import("./resellersDb");
    const r = await getReseller("tailwind");
    expect(r).not.toBeNull();
    expect(r?.companyName).toBe("Tailwind Premiums");
  });

  it("getReseller returns null for an unknown id", async () => {
    const { getReseller } = await import("./resellersDb");
    const r = await getReseller("does-not-exist");
    expect(r).toBeNull();
  });

  it("getReseller is case-insensitive on the id", async () => {
    const { getReseller } = await import("./resellersDb");
    const r = await getReseller("TAILWIND");
    expect(r?.companyName).toBe("Tailwind Premiums");
  });

  it("setReseller overlay wins over the static entry", async () => {
    const { getReseller, setReseller } = await import("./resellersDb");
    await setReseller({
      id: "tailwind",
      companyName: "Tailwind (renamed)",
      logoUrl: null,
      accentColor: "#000000",
      pricing: {},
    });
    const r = await getReseller("tailwind");
    expect(r?.companyName).toBe("Tailwind (renamed)");
  });

  it("deleteReseller tombstones a static entry so it disappears from reads", async () => {
    const { getReseller, deleteReseller } = await import("./resellersDb");
    await deleteReseller("tailwind");
    expect(await getReseller("tailwind")).toBeNull();
  });

  it("re-adding a tombstoned id clears the tombstone", async () => {
    const { getReseller, setReseller, deleteReseller } = await import("./resellersDb");
    await deleteReseller("tailwind");
    expect(await getReseller("tailwind")).toBeNull();
    await setReseller({
      id: "tailwind",
      companyName: "Tailwind v2",
      logoUrl: null,
      accentColor: "#00A896",
      pricing: {},
    });
    const r = await getReseller("tailwind");
    expect(r?.companyName).toBe("Tailwind v2");
  });

  it("listResellers includes both static entries and KV-only additions", async () => {
    const { listResellers, setReseller } = await import("./resellersDb");
    await setReseller({
      id: "brand-new",
      companyName: "Brand New",
      logoUrl: null,
      accentColor: "#1a1a1a",
      pricing: {},
    });
    const all = await listResellers();
    const ids = all.map((r) => r.id);
    expect(ids).toContain("tailwind"); // static
    expect(ids).toContain("brand-new"); // KV-only
  });

  it("seedFromStatic copies every static entry into KV", async () => {
    const { seedFromStatic, listResellers } = await import("./resellersDb");
    const result = await seedFromStatic();
    expect(result.count).toBeGreaterThan(100);
    const all = await listResellers();
    expect(all.length).toBeGreaterThanOrEqual(result.count);
  });
});
