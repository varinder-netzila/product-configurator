import { createClient } from '@vercel/kv';

/**
 * Lightweight usage counters per reseller, stored in Vercel KV.
 *
 * Keys (all prefixed `stats:`):
 *   stats:<reseller>:<event>             integer  — lifetime total
 *   stats:<reseller>:<event>:<YYYY-MM>   integer  — bucket per month
 *   stats:resellers                      set       — every reseller id seen
 *   stats:<reseller>:events              set       — every event name seen
 *
 * `<reseller>` is "izy" when no reseller is active (the default IZY flow).
 * `<event>` is a short string like `view`, `tool:texture`, `step:2`, `quote`.
 *
 * Counter writes are fire-and-forget; never fail the request when KV is down.
 */

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const kv = REST_URL && REST_TOKEN ? createClient({ url: REST_URL, token: REST_TOKEN }) : null;

const PREFIX = 'stats:';
const RESELLERS_INDEX = `${PREFIX}resellers`;

/** Current YYYY-MM bucket key (UTC). */
function monthBucket(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function sanitize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9_:.\-]/g, '_').slice(0, 64);
}

/** Increment counters for a reseller + event. Safe to call in a hot path.
 *  Optionally also bumps a geo counter (`country` is an ISO-3166-1 alpha-2
 *  code like "NL", "DE"; pass undefined to skip). */
export async function track(
  rawReseller: string | null | undefined,
  rawEvent: string,
  country?: string | null,
): Promise<void> {
  if (!kv) return;
  const reseller = sanitize(rawReseller || 'izy') || 'izy';
  const event = sanitize(rawEvent);
  if (!event) return;
  const month = monthBucket();
  try {
    const ops: Promise<unknown>[] = [
      kv.incr(`${PREFIX}${reseller}:${event}`),
      kv.incr(`${PREFIX}${reseller}:${event}:${month}`),
      kv.sadd(RESELLERS_INDEX, reseller),
      kv.sadd(`${PREFIX}${reseller}:events`, event),
    ];
    // Only bump geo on the primary engagement signal so we don't double-count
    // (every tab click would otherwise re-increment the same visitor).
    if (event === 'view' && country) {
      const cc = sanitize(country).toUpperCase().slice(0, 2);
      if (cc.length === 2) {
        ops.push(kv.incr(`${PREFIX}${reseller}:geo:${cc}`));
        ops.push(kv.sadd(`${PREFIX}${reseller}:geo`, cc));
      }
    }
    await Promise.all(ops);
  } catch (e) {
    console.error('[stats] track failed', e);
  }
}

export interface ResellerStats {
  reseller: string;
  totals: Record<string, number>; // event → lifetime total
  monthly: Record<string, Record<string, number>>; // event → {YYYY-MM → count}
  geo: Record<string, number>; // ISO country → view count
}

/** Returns the last N month buckets (oldest → newest), e.g. ["2026-01","2026-02",…]. */
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d);
    m.setUTCMonth(m.getUTCMonth() - i);
    out.push(monthBucket(m));
  }
  return out;
}

/** Read every reseller's totals + the last `months` of monthly counts. */
export async function getAllStats(months = 6): Promise<{
  resellers: ResellerStats[];
  months: string[];
}> {
  if (!kv) return { resellers: [], months: lastMonths(months) };

  const ids = (await kv.smembers(RESELLERS_INDEX)) ?? [];
  const monthList = lastMonths(months);

  const out: ResellerStats[] = [];
  for (const id of ids) {
    const events = (await kv.smembers(`${PREFIX}${id}:events`)) ?? [];
    const countries = (await kv.smembers(`${PREFIX}${id}:geo`)) ?? [];
    const totals: Record<string, number> = {};
    const monthly: Record<string, Record<string, number>> = {};
    const geo: Record<string, number> = {};

    // Collect lifetime totals + monthly buckets for every known event.
    const allKeys: string[] = [];
    for (const e of events) {
      allKeys.push(`${PREFIX}${id}:${e}`);
      for (const m of monthList) allKeys.push(`${PREFIX}${id}:${e}:${m}`);
    }
    for (const c of countries) allKeys.push(`${PREFIX}${id}:geo:${c}`);

    if (allKeys.length === 0) {
      out.push({ reseller: id, totals, monthly, geo });
      continue;
    }
    const values = await kv.mget<(number | string | null)[]>(...allKeys);

    let idx = 0;
    for (const e of events) {
      const lifetime = Number(values[idx++] ?? 0) || 0;
      totals[e] = lifetime;
      monthly[e] = {};
      for (const m of monthList) {
        monthly[e][m] = Number(values[idx++] ?? 0) || 0;
      }
    }
    for (const c of countries) {
      geo[c] = Number(values[idx++] ?? 0) || 0;
    }
    out.push({ reseller: id, totals, monthly, geo });
  }

  // Stable order: most active first (by total of all events).
  out.sort((a, b) => {
    const sum = (o: ResellerStats) => Object.values(o.totals).reduce((s, n) => s + n, 0);
    return sum(b) - sum(a);
  });

  return { resellers: out, months: monthList };
}
