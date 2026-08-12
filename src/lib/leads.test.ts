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

const sampleLead = (id: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  id,
  createdAt: new Date(2026, 5, 1).toISOString(),
  name: "Jan", email: "jan@example.com", phone: "0612345678",
  companyName: "Jansen B.V.",
  streetAddress: "Voorbeeldstraat 1", city: "Amsterdam",
  postalCode: "1234 AB", country: "Nederland",
  notes: "",
  bottleName: "Bottle", numberOfBottles: 100,
  ...overrides,
});

describe("leads storage", () => {
  it("saveLead + getLeads roundtrip; new leads default to status=pending", async () => {
    const { saveLead, getLeads } = await import("./leads");
    await saveLead(sampleLead("B2B-1"));
    const all = await getLeads();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("B2B-1");
    expect(all[0].status).toBe("pending");
    expect(all[0].internalNotes).toBe("");
  });

  it("patchLead updates status without losing other fields", async () => {
    const { saveLead, patchLead, getLeads } = await import("./leads");
    await saveLead(sampleLead("B2B-2"));
    const updated = await patchLead("B2B-2", { status: "quoted", internalNotes: "Reached out" });
    expect(updated?.status).toBe("quoted");
    expect(updated?.internalNotes).toBe("Reached out");
    expect(updated?.companyName).toBe("Jansen B.V.");

    const all = await getLeads();
    expect(all[0].status).toBe("quoted");
  });

  it("patchLead returns null for an unknown id", async () => {
    const { patchLead } = await import("./leads");
    const r = await patchLead("does-not-exist", { status: "won" });
    expect(r).toBeNull();
  });

  it("getLeads merges legacy list entries with the new per-id store", async () => {
    // Seed a legacy entry directly into the in-memory KV before the lib
    // initialises, so we can verify it shows up alongside new-format leads.
    await kv.lpush("leads", JSON.stringify(sampleLead("LEGACY-1", { companyName: "Old B.V." })));

    const { saveLead, getLeads } = await import("./leads");
    await saveLead(sampleLead("NEW-1", { companyName: "New B.V." }));

    const all = await getLeads();
    const ids = all.map((l) => l.id).sort();
    expect(ids).toEqual(["LEGACY-1", "NEW-1"]);
    // Legacy leads also get the default status applied on read.
    expect(all.find((l) => l.id === "LEGACY-1")?.status).toBe("pending");
  });

  it("patchLead promotes a legacy lead into the new store", async () => {
    await kv.lpush("leads", JSON.stringify(sampleLead("LEGACY-2")));
    const { patchLead } = await import("./leads");
    const r = await patchLead("LEGACY-2", { status: "won" });
    expect(r?.status).toBe("won");
    // The new key should now exist.
    expect(await kv.get("lead:LEGACY-2")).not.toBeNull();
  });
});
