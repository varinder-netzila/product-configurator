/**
 * In-memory fake of the subset of @vercel/kv we use. Each test gets its own
 * instance via createFakeKv() so state doesn't leak between tests.
 *
 * Only the methods the lib code calls are implemented. Behaviour mirrors
 * real Redis just closely enough for the tests we care about — no expiry,
 * no transactions, single-process.
 */
export function createFakeKv() {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const lists = new Map<string, string[]>();

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const v = strings.get(key);
      if (v === undefined) return null;
      // Mimic @vercel/kv: JSON-encoded strings are auto-parsed.
      try { return JSON.parse(v) as T; } catch { return v as T; }
    },
    async set(key: string, value: string): Promise<"OK"> {
      strings.set(key, value);
      return "OK";
    },
    async del(key: string): Promise<number> {
      const had = strings.has(key) || sets.has(key) || lists.has(key);
      strings.delete(key); sets.delete(key); lists.delete(key);
      return had ? 1 : 0;
    },
    async incr(key: string): Promise<number> {
      const current = Number(strings.get(key) ?? 0);
      const next = current + 1;
      strings.set(key, String(next));
      return next;
    },
    async sadd(key: string, ...members: string[]): Promise<number> {
      const s = sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const m of members) { if (!s.has(m)) { s.add(m); added++; } }
      sets.set(key, s);
      return added;
    },
    async srem(key: string, ...members: string[]): Promise<number> {
      const s = sets.get(key);
      if (!s) return 0;
      let removed = 0;
      for (const m of members) { if (s.delete(m)) removed++; }
      return removed;
    },
    async smembers(key: string): Promise<string[]> {
      return Array.from(sets.get(key) ?? []);
    },
    async sismember(key: string, member: string): Promise<number> {
      return sets.get(key)?.has(member) ? 1 : 0;
    },
    async mget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
      return keys.map((k) => {
        const v = strings.get(k);
        if (v === undefined) return null;
        try { return JSON.parse(v) as T; } catch { return v as unknown as T; }
      });
    },
    async lpush(key: string, ...values: string[]): Promise<number> {
      const list = lists.get(key) ?? [];
      list.unshift(...values.reverse()); // mimic LPUSH semantics
      lists.set(key, list);
      return list.length;
    },
    async lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
      const list = lists.get(key) ?? [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end).map((v) => {
        try { return JSON.parse(v) as T; } catch { return v as unknown as T; }
      });
    },
  };
}

export type FakeKv = ReturnType<typeof createFakeKv>;
