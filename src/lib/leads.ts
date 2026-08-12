import { createClient } from '@vercel/kv';

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const kv = REST_URL && REST_TOKEN ? createClient({ url: REST_URL, token: REST_TOKEN }) : null;

export type LeadStatus = 'pending' | 'quoted' | 'won' | 'lost';

/** A persisted B2B quote request, shown in the /admin/leads dashboard. */
export interface Lead {
  id: string;
  createdAt: string;
  // Workflow (added later — older leads default to pending / "").
  status?: LeadStatus;
  internalNotes?: string;
  // Contact
  name: string;
  email: string;
  phone: string;
  companyName: string;
  // Shipping
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string;
  // Product + pricing
  bottleName: string;
  numberOfBottles: number;
  advicePrice?: number;
  advicePriceTotal?: number;
  retailPrice?: number;
  // Design assets (ImageKit URLs)
  designLink?: string;
  mockupLink?: string;
  // White-label routing
  resellerId?: string;
  resellerName?: string;
}

// Legacy: pre-workflow leads were lpush'd into this single list as JSON strings.
const LEGACY_LIST_KEY = 'leads';

// New: each lead lives in its own key so it can be patched in place.
const ID_INDEX_KEY = 'leads:index'; // list of ids, newest first
const idKey = (id: string) => `lead:${id}`;

/** Ensure every lead has the workflow fields the UI relies on. */
function normalize(lead: Lead): Lead {
  return { status: 'pending', internalNotes: '', ...lead };
}

/** Persist a lead. Never throws — a storage hiccup must not fail the request
 *  (the email notification is the primary delivery path). */
export async function saveLead(lead: Lead): Promise<void> {
  if (!kv) {
    console.warn('[leads] KV not configured — lead not persisted');
    return;
  }
  const full = normalize(lead);
  try {
    await Promise.all([
      kv.set(idKey(full.id), JSON.stringify(full)),
      kv.lpush(ID_INDEX_KEY, full.id),
    ]);
  } catch (e) {
    console.error('[leads] save failed', e);
  }
}

/** Update workflow fields (status, notes) on an existing lead. Returns the
 *  updated lead, or null when the lead can't be found / KV isn't configured. */
export async function patchLead(
  id: string,
  patch: { status?: LeadStatus; internalNotes?: string },
): Promise<Lead | null> {
  if (!kv) return null;
  try {
    let current = await readById(id);
    if (!current) {
      // The lead may still live in the legacy list — promote it before patching.
      current = await findInLegacyList(id);
      if (!current) return null;
      await kv.set(idKey(id), JSON.stringify(normalize(current)));
      await kv.lpush(ID_INDEX_KEY, id);
    }
    const next = normalize({ ...current, ...patch });
    await kv.set(idKey(id), JSON.stringify(next));
    return next;
  } catch (e) {
    console.error('[leads] patch failed', e);
    return null;
  }
}

async function readById(id: string): Promise<Lead | null> {
  if (!kv) return null;
  const raw = await kv.get<string | Lead>(idKey(id));
  if (!raw) return null;
  return typeof raw === 'string' ? (JSON.parse(raw) as Lead) : raw;
}

async function findInLegacyList(id: string): Promise<Lead | null> {
  if (!kv) return null;
  const raw = await kv.lrange<string | Lead>(LEGACY_LIST_KEY, 0, -1);
  for (const r of raw || []) {
    const lead = typeof r === 'string' ? (JSON.parse(r) as Lead) : r;
    if (lead.id === id) return lead;
  }
  return null;
}

/** Read every lead, newest first. Merges:
 *   - per-id keys created since the workflow upgrade (`lead:<id>` + index)
 *   - the legacy `leads` list of JSON strings (pre-workflow)
 * Per-id wins when an id appears in both. */
export async function getLeads(): Promise<Lead[]> {
  if (!kv) return [];
  try {
    const [indexIds, legacy] = await Promise.all([
      kv.lrange<string>(ID_INDEX_KEY, 0, -1).catch(() => [] as string[]),
      kv.lrange<string | Lead>(LEGACY_LIST_KEY, 0, -1).catch(() => [] as (string | Lead)[]),
    ]);

    const out = new Map<string, Lead>();

    // Legacy first (older entries), so per-id values from the new store
    // overwrite them when present.
    for (const r of legacy || []) {
      const lead = typeof r === 'string' ? (JSON.parse(r) as Lead) : r;
      if (lead?.id) out.set(lead.id, normalize(lead));
    }

    if ((indexIds || []).length > 0) {
      const keys = indexIds.map(idKey);
      const values = await kv.mget<(string | Lead | null)[]>(...keys);
      for (let i = 0; i < indexIds.length; i++) {
        const v = values[i];
        if (!v) continue;
        const lead = typeof v === 'string' ? (JSON.parse(v) as Lead) : (v as Lead);
        if (lead?.id) out.set(lead.id, normalize(lead));
      }
    }

    // Sort newest first by createdAt.
    return Array.from(out.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (e) {
    console.error('[leads] read failed', e);
    return [];
  }
}
