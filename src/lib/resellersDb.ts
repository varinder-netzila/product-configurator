import { createClient } from '@vercel/kv';
import { RESELLERS as STATIC_RESELLERS, type ResellerConfig } from '@/data/resellers';

/**
 * Runtime store for reseller configs. Reads merge two layers:
 *
 *   static config (src/data/resellers.ts)  ←  KV overlay (live admin edits)
 *
 * The static layer ships with the deploy and renders instantly. The KV layer
 * holds edits made via the admin UI; when present for an id, it fully replaces
 * the static entry. Resellers added via the UI live in KV only.
 *
 * Falls back gracefully to the static layer when KV isn't provisioned.
 */

// Re-use the same env-var detection as the leads lib so KV stays optional.
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const kv = REST_URL && REST_TOKEN ? createClient({ url: REST_URL, token: REST_TOKEN }) : null;

const PREFIX = 'reseller:';
const INDEX_KEY = 'resellers:index'; // set of all ids stored in KV
const TOMBSTONE_KEY = 'resellers:tombstones'; // ids deleted from KV that should hide the static entry

const idKey = (id: string) => `${PREFIX}${id}`;

/** Look up one reseller by id. KV edit wins; otherwise the static config; otherwise null. */
export async function getReseller(id: string | null | undefined): Promise<ResellerConfig | null> {
  if (!id) return null;
  const key = id.trim().toLowerCase();

  if (kv) {
    try {
      // If it was explicitly deleted via the admin UI, hide the static entry too.
      const tombstoned = await kv.sismember(TOMBSTONE_KEY, key);
      if (tombstoned) return null;

      const raw = await kv.get<ResellerConfig | string>(idKey(key));
      if (raw) {
        return typeof raw === 'string' ? (JSON.parse(raw) as ResellerConfig) : raw;
      }
    } catch (e) {
      console.error('[resellersDb] KV read failed for', key, e);
    }
  }

  return STATIC_RESELLERS[key] ?? null;
}

/** List every reseller (KV overrides win per-id). */
export async function listResellers(): Promise<ResellerConfig[]> {
  const merged = new Map<string, ResellerConfig>();
  for (const [id, r] of Object.entries(STATIC_RESELLERS)) merged.set(id, r);

  if (kv) {
    try {
      const tombstones = (await kv.smembers(TOMBSTONE_KEY)) ?? [];
      for (const t of tombstones) merged.delete(t);

      const ids = (await kv.smembers(INDEX_KEY)) ?? [];
      for (const id of ids) {
        const raw = await kv.get<ResellerConfig | string>(idKey(id));
        if (raw) {
          const parsed = typeof raw === 'string' ? (JSON.parse(raw) as ResellerConfig) : raw;
          merged.set(id, parsed);
        }
      }
    } catch (e) {
      console.error('[resellersDb] KV list failed', e);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
}

/** Upsert a reseller into KV. The static config is left untouched. */
export async function setReseller(reseller: ResellerConfig): Promise<void> {
  if (!kv) throw new Error('KV not configured');
  const id = reseller.id.trim().toLowerCase();
  await kv.set(idKey(id), JSON.stringify(reseller));
  await kv.sadd(INDEX_KEY, id);
  // Re-adding a previously-deleted id clears its tombstone.
  await kv.srem(TOMBSTONE_KEY, id);
}

/** Remove a reseller. If it exists in the static config, we add a tombstone so
 *  the static entry is also hidden. */
export async function deleteReseller(id: string): Promise<void> {
  if (!kv) throw new Error('KV not configured');
  const key = id.trim().toLowerCase();
  await kv.del(idKey(key));
  await kv.srem(INDEX_KEY, key);
  if (STATIC_RESELLERS[key]) {
    await kv.sadd(TOMBSTONE_KEY, key);
  }
}

/** One-time bootstrap: copy every static entry into KV so the admin UI starts
 *  with a complete list it can edit. Idempotent — re-running just re-writes
 *  the same values. */
export async function seedFromStatic(): Promise<{ count: number }> {
  if (!kv) throw new Error('KV not configured');
  let count = 0;
  for (const [id, r] of Object.entries(STATIC_RESELLERS)) {
    await kv.set(idKey(id), JSON.stringify(r));
    await kv.sadd(INDEX_KEY, id);
    count++;
  }
  return { count };
}
