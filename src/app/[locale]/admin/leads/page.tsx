"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/leads";
import AdminNav from "@/components/AdminNav";

const IZY_DIRECT = "__izy__";
const STATUSES: { value: LeadStatus; label: string; chip: string }[] = [
  { value: "pending", label: "Pending", chip: "bg-gray-100 text-gray-700" },
  { value: "quoted", label: "Quoted", chip: "bg-blue-100 text-blue-700" },
  { value: "won", label: "Won", chip: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", chip: "bg-red-100 text-red-700" },
];

export default function LeadsAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [search, setSearch] = useState("");

  // Per-lead transient state so notes save on blur without re-rendering siblings.
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      const next: Lead[] = Array.isArray(data.leads) ? data.leads : [];
      setLeads(next);
      setDraftNotes(Object.fromEntries(next.map((l) => [l.id, l.internalNotes || ""])));
      setAuthed(true);
    } catch { setAuthed(false); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLeads(); }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setPassword(""); await loadLeads(); }
      else { const d = await res.json().catch(() => ({})); setLoginError(d.error || "Login failed"); }
    } finally { setSubmitting(false); }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false); setLeads([]);
  };

  const patchLead = async (id: string, patch: Partial<Pick<Lead, "status" | "internalNotes">>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const { lead } = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === id ? lead : l)));
      }
    } finally { setSavingId(null); }
  };

  // Distinct resellers present in the data, for the source dropdown.
  const resellers = useMemo(() => {
    const names = new Set<string>();
    leads.forEach((l) => l.resellerName && names.add(l.resellerName));
    return Array.from(names).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (sourceFilter === IZY_DIRECT && l.resellerName) return false;
      if (sourceFilter !== "all" && sourceFilter !== IZY_DIRECT && l.resellerName !== sourceFilter) return false;
      if (statusFilter !== "all" && (l.status || "pending") !== statusFilter) return false;
      if (q) {
        const hay = `${l.name} ${l.companyName} ${l.email} ${l.phone} ${l.city} ${l.internalNotes || ""} ${l.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, sourceFilter, statusFilter, search]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("nl-NL", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };
  const money = (n?: number) => (typeof n === "number" ? `€${n.toFixed(2)}` : "—");
  const statusOf = (l: Lead): LeadStatus => l.status || "pending";
  const statusChip = (s: LeadStatus) => STATUSES.find((x) => x.value === s)?.chip || "";

  // Quick counters per status, shown next to the filter chips.
  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = { pending: 0, quoted: 0, won: 0, lost: 0 };
    for (const l of leads) c[statusOf(l)] += 1;
    return c;
  }, [leads]);

  // ── Login gate ──
  if (authed === false) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-gray-50 flex items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Leads dashboard</h1>
          <p className="text-sm text-gray-500 mb-4">Enter the admin password to continue.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 mb-3"
          />
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

  // ── Dashboard ──
  return (
    <div className="fixed inset-0 overflow-y-auto bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <AdminNav />
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filtered.length} of {leads.length} B2B quote request{leads.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company, email, city, notes…"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-900 w-72"
            />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-900"
            >
              <option value="all">All sources</option>
              <option value={IZY_DIRECT}>IZY direct</option>
              {resellers.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={loadLeads} className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              {loading ? "…" : "Refresh"}
            </button>
            <button onClick={logout} className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
              Log out
            </button>
          </div>
        </header>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusFilter === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
          >
            All ({leads.length})
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusFilter === s.value ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
            >
              {s.label} ({counts[s.value]})
            </button>
          ))}
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
            No leads yet. New B2B quote requests will appear here.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Company / Contact</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Advice (unit / total)</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Design</th>
                    <th className="px-4 py-3 min-w-[220px]">Internal notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((l) => {
                    const st = statusOf(l);
                    return (
                      <tr key={l.id} className="align-top hover:bg-gray-50/60">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtDate(l.createdAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={st}
                            onChange={(e) => patchLead(l.id, { status: e.target.value as LeadStatus })}
                            disabled={savingId === l.id}
                            className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${statusChip(st)} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300`}
                          >
                            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{l.companyName}</div>
                          <div className="text-gray-600">{l.name}</div>
                          <a href={`mailto:${l.email}`} className="text-blue-600 hover:underline block">{l.email}</a>
                          {l.phone && <div className="text-gray-500">{l.phone}</div>}
                          {(l.streetAddress || l.city) && (
                            <div className="text-gray-400 text-xs mt-1">
                              {l.streetAddress}, {l.postalCode} {l.city}, {l.country}
                            </div>
                          )}
                          {l.notes && <div className="text-gray-500 text-xs mt-1 italic max-w-xs whitespace-pre-wrap">&ldquo;{l.notes}&rdquo;</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">{l.bottleName}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{l.numberOfBottles}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{money(l.advicePrice)}</div>
                          <div className="text-gray-500">{money(l.advicePriceTotal)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {l.resellerName ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{l.resellerName}</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-900 text-white text-xs font-medium">IZY</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {l.mockupLink && (
                              <a href={l.mockupLink} target="_blank" rel="noopener noreferrer" title="3D mockup">
                                <img src={l.mockupLink} alt="mockup" className="w-12 h-12 object-cover rounded border border-gray-200" />
                              </a>
                            )}
                            {l.designLink && (
                              <a href={l.designLink} target="_blank" rel="noopener noreferrer" title="Flat print design">
                                <img src={l.designLink} alt="flat design" className="w-12 h-12 object-cover rounded border border-gray-200" />
                              </a>
                            )}
                            {!l.mockupLink && !l.designLink && <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={draftNotes[l.id] ?? ""}
                            onChange={(e) => setDraftNotes((d) => ({ ...d, [l.id]: e.target.value }))}
                            onBlur={() => {
                              const next = draftNotes[l.id] ?? "";
                              if (next !== (l.internalNotes || "")) patchLead(l.id, { internalNotes: next });
                            }}
                            rows={2}
                            placeholder="Internal notes…"
                            className="w-full min-w-[220px] px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-gray-900 resize-y"
                          />
                          {savingId === l.id && <div className="text-[10px] text-gray-400 mt-1">Saving…</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
