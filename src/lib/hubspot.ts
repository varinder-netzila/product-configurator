import { createClient } from "@vercel/kv";
import { HUBSPOT_COMPANY_IDS } from "@/data/hubspotMappings";

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const kv = REST_URL && REST_TOKEN ? createClient({ url: REST_URL, token: REST_TOKEN }) : null;

const CACHE_KEY = "hubspot:reseller-owners";
const CACHE_TTL_SEC = 60 * 60;

export type OwnerInfo = { name: string; email: string | null } | null;
export type ResellerOwnerMap = Record<string, OwnerInfo>;

export function isHubspotConfigured(): boolean {
  return !!TOKEN;
}

async function hsFetch<T>(path: string): Promise<T> {
  if (!TOKEN) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN not set");
  const res = await fetch(`https://api.hubapi.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HubSpot ${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function hsPost<T>(path: string, body: unknown): Promise<T> {
  if (!TOKEN) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN not set");
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HubSpot ${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

type CompanyBatchResp = {
  results: { id: string; properties: { hubspot_owner_id?: string } }[];
};
type OwnerResp = { id: string; firstName?: string; lastName?: string; email?: string };

async function fetchOwnersForCompanies(companyIds: number[]): Promise<ResellerOwnerMap> {
  if (companyIds.length === 0) return {};

  const ownerByCompanyId = new Map<number, string>();
  for (let i = 0; i < companyIds.length; i += 100) {
    const batch = companyIds.slice(i, i + 100);
    const resp = await hsPost<CompanyBatchResp>("/crm/v3/objects/companies/batch/read", {
      properties: ["hubspot_owner_id"],
      inputs: batch.map((id) => ({ id: String(id) })),
    });
    for (const r of resp.results) {
      const ownerId = r.properties.hubspot_owner_id;
      if (ownerId) ownerByCompanyId.set(Number(r.id), ownerId);
    }
  }

  const uniqueOwnerIds = Array.from(new Set(ownerByCompanyId.values()));
  const ownerInfoById = new Map<string, OwnerInfo>();
  await Promise.all(
    uniqueOwnerIds.map(async (ownerId) => {
      try {
        const o = await hsFetch<OwnerResp>(`/crm/v3/owners/${ownerId}`);
        const name = [o.firstName, o.lastName].filter(Boolean).join(" ").trim() || o.email || `Owner ${ownerId}`;
        ownerInfoById.set(ownerId, { name, email: o.email ?? null });
      } catch {
        ownerInfoById.set(ownerId, { name: `Owner ${ownerId}`, email: null });
      }
    }),
  );

  const out: ResellerOwnerMap = {};
  for (const [resellerId, companyId] of Object.entries(HUBSPOT_COMPANY_IDS)) {
    const ownerId = ownerByCompanyId.get(companyId);
    out[resellerId] = ownerId ? ownerInfoById.get(ownerId) ?? null : null;
  }
  return out;
}

export async function getResellerOwners(opts: { forceRefresh?: boolean } = {}): Promise<{
  owners: ResellerOwnerMap;
  cached: boolean;
  configured: boolean;
}> {
  if (!isHubspotConfigured()) return { owners: {}, cached: false, configured: false };

  if (!opts.forceRefresh && kv) {
    try {
      const raw = await kv.get<ResellerOwnerMap | string>(CACHE_KEY);
      if (raw) {
        const parsed = typeof raw === "string" ? (JSON.parse(raw) as ResellerOwnerMap) : raw;
        return { owners: parsed, cached: true, configured: true };
      }
    } catch (e) {
      console.error("[hubspot] cache read failed", e);
    }
  }

  const owners = await fetchOwnersForCompanies(Object.values(HUBSPOT_COMPANY_IDS));
  if (kv) {
    try {
      await kv.set(CACHE_KEY, JSON.stringify(owners), { ex: CACHE_TTL_SEC });
    } catch (e) {
      console.error("[hubspot] cache write failed", e);
    }
  }
  return { owners, cached: false, configured: true };
}
