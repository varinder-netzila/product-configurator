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

describe("stats", () => {
  it("track increments lifetime + month buckets and indexes the reseller + event", async () => {
    const { track } = await import("./stats");
    await track("tailwind", "view");
    await track("tailwind", "view");
    await track("tailwind", "tool:brand");

    expect(await kv.get("stats:tailwind:view")).toBe(2);
    expect(await kv.get("stats:tailwind:tool:brand")).toBe(1);
    expect(await kv.smembers("stats:resellers")).toContain("tailwind");
    const events = await kv.smembers("stats:tailwind:events");
    expect(events.sort()).toEqual(["tool:brand", "view"]);
  });

  it("track normalises missing reseller to 'izy'", async () => {
    const { track } = await import("./stats");
    await track(null, "view");
    expect(await kv.get("stats:izy:view")).toBe(1);
    expect(await kv.smembers("stats:resellers")).toContain("izy");
  });

  it("track only counts geo for the 'view' event (no double counting)", async () => {
    const { track } = await import("./stats");
    await track("tailwind", "view", "NL");
    await track("tailwind", "tool:brand", "NL");
    await track("tailwind", "step:2", "NL");

    expect(await kv.get("stats:tailwind:geo:NL")).toBe(1);
    expect(await kv.smembers("stats:tailwind:geo")).toEqual(["NL"]);
  });

  it("track ignores empty events", async () => {
    const { track } = await import("./stats");
    await track("tailwind", "");
    expect(await kv.smembers("stats:resellers")).toEqual([]);
  });

  it("getAllStats returns lifetime totals, monthly buckets and geo per reseller", async () => {
    const { track, getAllStats } = await import("./stats");
    await track("tailwind", "view", "NL");
    await track("tailwind", "view", "DE");
    await track("tailwind", "quote");

    const data = await getAllStats(6);
    expect(data.months.length).toBe(6);

    const t = data.resellers.find((r) => r.reseller === "tailwind");
    expect(t).toBeDefined();
    expect(t!.totals["view"]).toBe(2);
    expect(t!.totals["quote"]).toBe(1);
    expect(t!.geo).toMatchObject({ NL: 1, DE: 1 });
    // Latest month bucket should have the views.
    const currentMonth = data.months[data.months.length - 1];
    expect(t!.monthly["view"][currentMonth]).toBe(2);
  });

  it("getAllStats sorts most-active reseller first", async () => {
    const { track, getAllStats } = await import("./stats");
    await track("low", "view");
    await track("high", "view");
    await track("high", "view");
    await track("high", "quote");

    const data = await getAllStats(6);
    expect(data.resellers[0].reseller).toBe("high");
    expect(data.resellers[1].reseller).toBe("low");
  });
});
