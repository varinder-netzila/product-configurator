"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureKey, ResellerConfig } from "@/data/resellers";
import { STD_STAFFEL } from "@/data/resellers";
import type { PricingTier, ProductPricing } from "@/data/b2bPricing";
import AdminNav from "@/components/AdminNav";

const IZY_PRODUCTS = ["Cutting board", "IZY Bottle", "IZY Travel Bottle", "IZY Mug", "IZY Tumbler"] as const;

const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "texture", label: "All Over Print" },
  { key: "map", label: "City Map" },
  { key: "art", label: "Art" },
  { key: "jersey", label: "Jersey" },
  { key: "brand", label: "Brand" },
];

const emptyReseller = (): ResellerConfig => ({
  id: "",
  companyName: "",
  logoUrl: null,
  accentColor: "#1a1a1a",
  pricing: {},
  features: { art: false, jersey: false, },
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function ResellerAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [resellers, setResellers] = useState<ResellerConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ResellerConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");

  type OwnerInfo = { name: string; email: string | null } | null;
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});
  const [ownersConfigured, setOwnersConfigured] = useState<boolean | null>(null);
  const [ownersLoading, setOwnersLoading] = useState(false);

  const [baseUrl, setBaseUrl] = useState("https://configurator.izybottles.com");
  const [locale, setLocale] = useState("en");

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resellers", { cache: "no-store" });
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      setResellers(Array.isArray(data.resellers) ? data.resellers : []);
      setAuthed(true);
    } catch { setAuthed(false); }
    finally { setLoading(false); }
  };

  const loadOwners = async (forceRefresh = false) => {
    setOwnersLoading(true);
    try {
      const url = forceRefresh ? "/api/admin/reseller-owners?refresh=1" : "/api/admin/reseller-owners";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) { setOwnersConfigured(false); return; }
      const data = await res.json();
      setOwnersConfigured(data.configured === true);
      setOwners(data.owners || {});
    } catch {
      setOwnersConfigured(false);
    } finally {
      setOwnersLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (authed === true) loadOwners(); }, [authed]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setPassword(""); await loadAll(); }
      else { const d = await res.json().catch(() => ({})); setLoginError(d.error || "Login failed"); }
    } finally { setSubmitting(false); }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false); setResellers([]);
  };

  const seed = async () => {
    if (!confirm("Copy every static reseller into KV? Safe to re-run.")) return;
    const res = await fetch("/api/admin/seed-resellers", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { alert(`Seeded ${data.count} resellers.`); await loadAll(); }
    else { alert(`Seed failed: ${data.error || res.statusText}`); }
  };

  const startEdit = (r: ResellerConfig) => { setEditing(JSON.parse(JSON.stringify(r))); setIsNew(false); setSaveError(""); };
  const startCreate = () => { setEditing(emptyReseller()); setIsNew(true); setSaveError(""); };

  const save = async () => {
    if (!editing) return;
    if (!editing.id.trim() || !editing.companyName.trim()) {
      setSaveError("id and companyName are required"); return;
    }
    const url = isNew
      ? "/api/admin/resellers"
      : `/api/admin/resellers/${encodeURIComponent(editing.id)}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) { setEditing(null); await loadAll(); }
    else { const d = await res.json().catch(() => ({})); setSaveError(d.error || "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete reseller "${id}"? If it's also in the static config, it will be hidden via a tombstone.`)) return;
    const res = await fetch(`/api/admin/resellers/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) await loadAll();
    else { const d = await res.json().catch(() => ({})); alert(`Delete failed: ${d.error || res.statusText}`); }
  };

  // Re-sync ONE reseller's KV overlay from its current static config. Use this
  // when a git-push updates src/data/resellers.ts but the live config still
  // shows the old KV value (because the all-or-nothing "Seed from code" wipes
  // unrelated admin edits, this is the surgical alternative).
  const resync = async (id: string) => {
    if (!confirm(`Re-sync "${id}" from src/data/resellers.ts? Any admin-only edits to this reseller will be lost.`)) return;
    const res = await fetch(`/api/admin/resellers/${encodeURIComponent(id)}/resync`, { method: "POST" });
    if (res.ok) await loadAll();
    else { const d = await res.json().catch(() => ({})); alert(`Resync failed: ${d.error || res.statusText}`); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resellers;
    return resellers.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      (owners[r.id]?.name.toLowerCase().includes(q) ?? false),
    );
  }, [resellers, search, owners]);

  const embedUrl = (id: string) => `${baseUrl}/${locale}/configurator?reseller=${id}`;
  const iframeCode = (id: string) =>
    `<iframe src="${embedUrl(id)}" width="100%" height="900" frameborder="0" style="border:none;border-radius:16px;" allow="xr-spatial-tracking; clipboard-write"></iframe>`;

  // --- Login gate ---
  if (authed === false) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-gray-50 flex items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Reseller admin</h1>
          <p className="text-sm text-gray-500 mb-4">Enter the admin password to continue.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password" autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 mb-3" />
          {loginError && <p className="text-red-500 text-xs mb-3">{loginError}</p>}
          <button type="submit" disabled={submitting || !password}
            className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  if (authed === null) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // --- Edit panel ---
  if (editing) {
    const set = (patch: Partial<ResellerConfig>) => setEditing({ ...editing, ...patch });
    const setFeature = (key: FeatureKey, enabled: boolean) => {
      const next = { ...(editing.features || {}) };
      if (enabled) delete next[key]; else next[key] = false;
      set({ features: next });
    };
    return (
      <div className="fixed inset-0 overflow-y-auto bg-gray-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{isNew ? "New reseller" : `Edit ${editing.companyName}`}</h1>
            <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-900">Cancel</button>
          </header>

          <div className="space-y-4">
            <Row label="ID (URL-safe)">
              <input value={editing.id} disabled={!isNew}
                onChange={(e) => set({ id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g. tailwind" />
            </Row>
            <Row label="Company name">
              <input value={editing.companyName} onChange={(e) => set({ companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            </Row>
            <Row label="Logo URL">
              <input value={editing.logoUrl ?? ""} onChange={(e) => set({ logoUrl: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="https://… (leave empty for name-fallback)" />
            </Row>
            <Row label="Logo invert">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!editing.logoInvert}
                  onChange={(e) => set({ logoInvert: e.target.checked || undefined })} />
                Apply CSS invert (for white-only logos)
              </label>
            </Row>
            <Row label="Logo height">
              <input value={editing.logoHeight ?? ""} onChange={(e) => set({ logoHeight: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="e.g. 4rem (default: 3.5rem)" />
            </Row>
            <Row label="Accent colour">
              <div className="flex items-center gap-2">
                <input type="color" value={editing.accentColor}
                  onChange={(e) => set({ accentColor: e.target.value })}
                  className="h-9 w-12 rounded border border-gray-200" />
                <input value={editing.accentColor} onChange={(e) => set({ accentColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono" />
              </div>
            </Row>
            <Row label="Lead email">
              <input value={editing.email ?? ""} onChange={(e) => set({ email: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="Leave empty to route leads to IZY only" />
            </Row>
            <Row label="Support URL">
              <input value={editing.supportUrl ?? ""} onChange={(e) => set({ supportUrl: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="https://… or mailto:… (defaults to mailto:<lead email>)" />
            </Row>
            <Row label="Strip prefix">
              <input value={editing.stripPrefix ?? ""} onChange={(e) => set({ stripPrefix: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder='Default: "IZY " — strips that prefix from product names' />
            </Row>
            <Row label="Features enabled">
              <div className="flex flex-wrap gap-3">
                {FEATURES.map(({ key, label }) => {
                  const enabled = editing.features?.[key] !== false;
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={enabled}
                        onChange={(e) => setFeature(key, e.target.checked)} />
                      {label}
                    </label>
                  );
                })}
              </div>
            </Row>
            <Row label="Pricing">
              <PricingEditor
                pricing={editing.pricing || {}}
                onChange={(p) => set({ pricing: p })}
              />
            </Row>

            {saveError && <p className="text-sm text-red-500">{saveError}</p>}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={save}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="fixed inset-0 overflow-y-auto bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <AdminNav />
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resellers</h1>
            <p className="text-sm text-gray-500 mt-1">{filtered.length} of {resellers.length}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-900" />
            <button onClick={startCreate}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
              + New
            </button>
            <button onClick={seed}
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              title="Copy every static reseller into KV (one-time bootstrap, idempotent)">
              Seed from code
            </button>
            <button onClick={loadAll}
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              {loading ? "…" : "Refresh"}
            </button>
            <button onClick={() => loadOwners(true)}
              disabled={ownersConfigured === false}
              title={ownersConfigured === false
                ? "Set HUBSPOT_PRIVATE_APP_TOKEN to enable HubSpot owner sync"
                : "Re-fetch HubSpot owner names (cache TTL is 1h)"}
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              {ownersLoading ? "…" : "Sync owners"}
            </button>
            <button onClick={logout}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
              Log out
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white rounded-2xl border border-gray-200">
          <label className="flex-1 min-w-[260px]">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Base URL</span>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value.replace(/\/$/, ""))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900" />
          </label>
          <label className="w-28">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Locale</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-900">
              <option value="en">en</option><option value="nl">nl</option>
              <option value="fr">fr</option><option value="de">de</option>
              <option value="cs">cs</option>
            </select>
          </label>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div>
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-3 w-[22%]">Reseller</th>
                  <th className="px-3 py-3 w-[12%]">Owner</th>
                  <th className="px-3 py-3 w-[6%]">Accent</th>
                  <th className="px-3 py-3 w-[26%]">Features</th>
                  <th className="px-3 py-3 w-[14%]">Leads</th>
                  <th className="px-3 py-3 w-[10%]">Embed</th>
                  <th className="px-3 py-3 w-[10%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {r.logoUrl ? (
                          <img
                            src={r.logoUrl}
                            alt=""
                            style={r.logoInvert ? { filter: "invert(1)" } : undefined}
                            className="w-12 h-12 object-contain rounded-md border border-gray-200 bg-white p-1 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-md border border-gray-200 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: r.accentColor }}
                          >
                            {r.companyName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{r.companyName}</div>
                          <div className="text-xs text-gray-500 truncate"><code>{r.id}</code></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {ownersConfigured === false ? (
                        <em className="text-gray-300">—</em>
                      ) : owners[r.id] ? (
                        <span className="text-gray-700 truncate block" title={owners[r.id]!.name}>{owners[r.id]!.name}</span>
                      ) : ownersLoading ? (
                        <span className="text-gray-300">…</span>
                      ) : (
                        <em className="text-gray-300">—</em>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div
                        className="w-5 h-5 rounded-full border border-gray-200"
                        style={{ backgroundColor: r.accentColor }}
                        title={r.accentColor}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {FEATURES.map(({ key, label }) => {
                          const on = r.features?.[key] !== false;
                          return (
                            <span key={key}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      <span className="truncate block" title={r.email || "IZY only"}>
                        {r.email || <em className="text-gray-400">IZY only</em>}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <a href={embedUrl(r.id)} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">Open</a>
                        <CopyButton text={iframeCode(r.id)} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(r)}
                        className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 mr-1">
                        Edit
                      </button>
                      <button onClick={() => resync(r.id)}
                        title="Re-sync this reseller's KV overlay from its current src/data/resellers.ts entry"
                        className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 mr-1">
                        Resync
                      </button>
                      <button onClick={() => remove(r.id)}
                        className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start md:items-center">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div>{children}</div>
    </div>
  );
}

// ─── Pricing editor ───────────────────────────────────────────────────────
// Lets the admin edit the volume staffel per IZY product:
//   - retail (RRP)
//   - tiers: { label, min, max, price }
// Leaving a product out (no entry in pricing) hides it from the reseller's
// customers (they see "on request"). The "Copy default" button copies the
// shared STD_STAFFEL values for that product.

function PricingEditor({
  pricing,
  onChange,
}: {
  pricing: Record<string, ProductPricing>;
  onChange: (p: Record<string, ProductPricing>) => void;
}) {
  const applyDefaultAll = () => {
    const next: Record<string, ProductPricing> = {};
    for (const p of IZY_PRODUCTS) if (STD_STAFFEL[p]) next[p] = JSON.parse(JSON.stringify(STD_STAFFEL[p]));
    onChange(next);
  };
  const clearAll = () => onChange({});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pb-1">
        <p className="text-xs text-gray-500">
          Per-product retail and volume tiers. Leave a product empty to show &ldquo;on request&rdquo;.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyDefaultAll}
            className="px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            title="Set every product to the shared STD_STAFFEL values"
          >
            Apply default staffel to all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-500"
          >
            Clear all
          </button>
        </div>
      </div>

      {IZY_PRODUCTS.map((product) => (
        <ProductPricingCard
          key={product}
          product={product}
          value={pricing[product]}
          onChange={(p) => {
            const next = { ...pricing };
            if (p) next[product] = p; else delete next[product];
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

function ProductPricingCard({
  product,
  value,
  onChange,
}: {
  product: string;
  value: ProductPricing | undefined;
  onChange: (p: ProductPricing | null) => void;
}) {
  const tiers = value?.tiers ?? [];

  const setRetail = (v: number) =>
    onChange({ retail: v, tiers: tiers });

  const setTier = (i: number, patch: Partial<PricingTier>) => {
    const nextTiers = tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    onChange({ retail: value?.retail ?? 0, tiers: nextTiers });
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? (last.max ?? last.min) + 1 : 50;
    const newTier: PricingTier = { label: `${nextMin}+`, min: nextMin, max: null, price: 0 };
    onChange({ retail: value?.retail ?? 0, tiers: [...tiers, newTier] });
  };

  const removeTier = (i: number) => {
    const nextTiers = tiers.filter((_, idx) => idx !== i);
    onChange({ retail: value?.retail ?? 0, tiers: nextTiers });
  };

  const applyDefault = () => {
    if (STD_STAFFEL[product]) onChange(JSON.parse(JSON.stringify(STD_STAFFEL[product])));
  };

  const clear = () => onChange(null);

  const hasData = !!value;

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/40">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-semibold text-sm text-gray-900">{product}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={applyDefault}
            className="px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50"
          >
            Copy default
          </button>
          {hasData && (
            <button
              type="button"
              onClick={clear}
              className="px-2 py-1 text-[11px] font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-500"
              title='Remove this product (shows "on request")'
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        <p className="text-xs text-gray-400 italic">No pricing set — shows &ldquo;on request&rdquo;.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-gray-600 w-20">Retail (RRP)</label>
            <span className="text-gray-500 text-sm">€</span>
            <input
              type="number"
              step="0.01"
              value={value!.retail}
              onChange={(e) => setRetail(parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-md"
            />
          </div>

          {tiers.length > 0 && (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_70px_70px_90px_28px] gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide px-1">
                <div>Label</div>
                <div>Min</div>
                <div>Max</div>
                <div>Price</div>
                <div></div>
              </div>
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_70px_90px_28px] gap-2 items-center">
                  <input
                    value={t.label}
                    onChange={(e) => setTier(i, { label: e.target.value })}
                    className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white"
                    placeholder="50-99"
                  />
                  <input
                    type="number"
                    value={t.min}
                    onChange={(e) => setTier(i, { min: parseInt(e.target.value, 10) || 0 })}
                    className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white"
                  />
                  <input
                    type="number"
                    value={t.max ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setTier(i, { max: v === "" ? null : parseInt(v, 10) });
                    }}
                    className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white"
                    placeholder="—"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">€</span>
                    <input
                      type="number"
                      step="0.01"
                      value={t.price}
                      onChange={(e) => setTier(i, { price: parseFloat(e.target.value) || 0 })}
                      className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    className="text-red-500 hover:text-red-700 text-lg leading-none"
                    title="Remove tier"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addTier}
            className="mt-2 px-2 py-1 text-[11px] font-semibold rounded-md border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            + Add tier
          </button>
        </>
      )}
    </div>
  );
}
