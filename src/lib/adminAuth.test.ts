import { describe, it, expect, beforeEach, vi } from "vitest";

// adminAuth reads ADMIN_PASSWORD at call-time, so we set it before importing.
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("adminAuth", () => {
  it("checkPassword: false when ADMIN_PASSWORD is unset", async () => {
    const { checkPassword } = await import("./adminAuth");
    expect(checkPassword("anything")).toBe(false);
  });

  it("checkPassword: true only for the configured password", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "let-me-in");
    const { checkPassword } = await import("./adminAuth");
    expect(checkPassword("let-me-in")).toBe(true);
    expect(checkPassword("wrong")).toBe(false);
    expect(checkPassword("")).toBe(false);
  });

  it("checkPassword: rejects same-length-wrong attempts (constant-time)", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    const { checkPassword } = await import("./adminAuth");
    expect(checkPassword("secret")).toBe(true);
    expect(checkPassword("secref")).toBe(false); // same length, one char off
  });

  it("makeSessionToken: deterministic per password, changes with it", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "one");
    const a = (await import("./adminAuth")).makeSessionToken();

    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "one");
    const b = (await import("./adminAuth")).makeSessionToken();

    expect(a).toBe(b);
    expect(typeof a).toBe("string");
    expect(a?.length).toBeGreaterThan(20);

    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "different");
    const c = (await import("./adminAuth")).makeSessionToken();
    expect(c).not.toBe(a);
  });

  it("makeSessionToken: null when ADMIN_PASSWORD is unset", async () => {
    const { makeSessionToken } = await import("./adminAuth");
    expect(makeSessionToken()).toBeNull();
  });
});
