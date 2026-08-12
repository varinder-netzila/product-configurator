"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminNav from "@/components/AdminNav";

interface ResellerStats {
  reseller: string;
  totals: Record<string, number>;
  monthly: Record<string, Record<string, number>>;
  geo: Record<string, number>;
}

const EVENT_LABELS: Record<string, string> = {
  view: "Views",
  "tool:texture": "Tool: All Over Print",
  "tool:map": "Tool: City Map",
  "tool:art": "Tool: Art",
  "tool:jersey": "Tool: Jersey",
  "tool:brand": "Tool: Brand",
  "tool:text": "Tool: Text",
  "tool:ai": "Tool: AI",
  "step:2": "Reached step 2",
  "step:3": "Reached step 3",
  quote: "Quote submitted",
};

const KNOWN_ORDER = [
  "view", "tool:texture", "tool:map", "tool:art", "tool:jersey", "tool:brand",
  "step:2", "step:3", "quote",
];

function sortEvents(events: string[]): string[] {
  const known = KNOWN_ORDER.filter((k) => events.includes(k));
  const extra = events.filter((e) => !KNOWN_ORDER.includes(e)).sort();
  return [...known, ...extra];
}

export default function StatsAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [resellers, setResellers] = useState<ResellerStats[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [live, setLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Initial fetch (also used as the auth probe). The SSE stream takes over
  // once we know we're authed, providing real-time updates.
  const load = async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      setResellers(Array.isArray(data.resellers) ? data.resellers : []);
      setMonths(Array.isArray(data.months) ? data.months : []);
      setAuthed(true);
      setLastUpdate(new Date());
    } catch { setAuthed(false); }
  };

  useEffect(() => { load(); }, []);

  // Real-time updates via Server-Sent Events. Reconnects automatically; the
  // server pushes the full snapshot every ~5s, so a missed message is harmless.
  useEffect(() => {
    if (authed !== true || !live) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }
    const es = new EventSource("/api/admin/stats/stream", { withCredentials: true });
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (Array.isArray(data.resellers)) setResellers(data.resellers);
        if (Array.isArray(data.months)) setMonths(data.months);
        setLastUpdate(new Date());
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => { /* EventSource handles reconnect itself */ };
    esRef.current = es;
    return () => { es.close(); };
  }, [authed, live]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setPassword(""); await load(); }
      else { const d = await res.json().catch(() => ({})); setLoginError(d.error || "Login failed"); }
    } finally { setSubmitting(false); }
  };
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false); setResellers([]);
  };

  const summary = useMemo(() => {
    let views = 0, step2 = 0, step3 = 0, quotes = 0;
    for (const r of resellers) {
      views += r.totals["view"] || 0;
      step2 += r.totals["step:2"] || 0;
      step3 += r.totals["step:3"] || 0;
      quotes += r.totals["quote"] || 0;
    }
    return { views, step2, step3, quotes };
  }, [resellers]);

  // Counts in funnel order: view → step 2 → step 3 → quote.
  const globalFunnel = useMemo(
    () => [summary.views, summary.step2, summary.step3, summary.quotes],
    [summary],
  );

  // ─── CSV export ────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (resellers.length === 0) return;
    const allEvents = new Set<string>();
    for (const r of resellers) Object.keys(r.totals).forEach((e) => allEvents.add(e));
    const eventList = sortEvents(Array.from(allEvents));
    const header = [
      "reseller",
      ...eventList.map((e) => `total: ${e}`),
      ...eventList.flatMap((e) => months.map((m) => `${e} ${m}`)),
      "geo",
    ];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = resellers.map((r) => {
      const geoStr = Object.entries(r.geo || {})
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c}:${n}`)
        .join(" | ");
      return [
        r.reseller,
        ...eventList.map((e) => r.totals[e] ?? 0),
        ...eventList.flatMap((e) => months.map((m) => r.monthly[e]?.[m] ?? 0)),
        geoStr,
      ].map(esc).join(",");
    });
    const csv = [header.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reseller-stats-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (authed === false) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-gray-50 flex items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Usage stats</h1>
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

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <AdminNav />
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usage stats</h1>
            <p className="text-sm text-gray-500 mt-1">
              Per-reseller counters &middot; last {months.length} months &middot; lifetime totals
              {lastUpdate && <> &middot; <span className="text-gray-400">updated {lastUpdate.toLocaleTimeString()}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-700 px-3 py-2 rounded-lg border border-gray-200 bg-white">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
              Real-time {live && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            </label>
            <button onClick={exportCsv} disabled={resellers.length === 0}
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50">
              Export CSV
            </button>
            <button onClick={load}
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              Refresh
            </button>
            <button onClick={logout}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700">
              Log out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <KPI label="Total views" value={summary.views} />
          <KPI label="Reached step 2" value={summary.step2} />
          <KPI label="Quote requests" value={summary.quotes} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Funnel (all resellers)</div>
          <FunnelChart counts={globalFunnel} />
        </div>

        {resellers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
            No usage recorded yet. The first configurator visit will start populating counters.
          </div>
        ) : (
          <div className="space-y-3">
            {resellers.map((r) => {
              const events = sortEvents(Object.keys(r.totals));
              const totalActivity = events.reduce((s, e) => s + (r.totals[e] || 0), 0);
              const geoEntries = Object.entries(r.geo || {}).sort((a, b) => b[1] - a[1]);
              return (
                <details key={r.reseller} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                  <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-semibold text-gray-900">{r.reseller === "izy" ? "IZY (direct)" : r.reseller}</span>
                      <span className="text-xs text-gray-500">{totalActivity} events total</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{r.totals["view"] || 0} views</span>
                      <span>·</span>
                      <span>{r.totals["quote"] || 0} quotes</span>
                    </div>
                  </summary>
                  <div className="border-t border-gray-100">
                    {/* Reseller funnel */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Funnel
                      </div>
                      <FunnelChart counts={[
                        r.totals["view"] || 0,
                        r.totals["step:2"] || 0,
                        r.totals["step:3"] || 0,
                        r.totals["quote"] || 0,
                      ]} />
                    </div>

                    {/* Per-event table with sparkline */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="px-4 py-2">Event</th>
                            <th className="px-4 py-2 text-right">Lifetime</th>
                            {months.map((m) => (
                              <th key={m} className="px-3 py-2 text-right whitespace-nowrap">{m}</th>
                            ))}
                            <th className="px-4 py-2">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {events.map((e) => {
                            const monthlyVals = months.map((m) => r.monthly[e]?.[m] || 0);
                            return (
                              <tr key={e} className="hover:bg-gray-50/60">
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {EVENT_LABELS[e] ?? e}{" "}
                                  <code className="text-[10px] text-gray-400 ml-1">{e}</code>
                                </td>
                                <td className="px-4 py-2 text-right font-mono">{r.totals[e] ?? 0}</td>
                                {months.map((m) => (
                                  <td key={m} className="px-3 py-2 text-right font-mono text-gray-600">
                                    {r.monthly[e]?.[m] || ""}
                                  </td>
                                ))}
                                <td className="px-4 py-2">
                                  <BarChart values={monthlyVals} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Geo block */}
                    {geoEntries.length > 0 && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50/40">
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Views by country
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {geoEntries.map(([cc, n]) => (
                            <div key={cc}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs">
                              <span className="text-base leading-none">{countryFlag(cc)}</span>
                              <span className="font-semibold text-gray-900">{cc}</span>
                              <span className="text-gray-500">{n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

/** Horizontal funnel chart: bar widths scale to the first step, drop-off %
 *  shown between consecutive steps. Counts are in funnel order. */
function FunnelChart({ counts }: { counts: number[] }) {
  const labels = ["Views", "Step 2", "Step 3", "Quote"];
  const top = counts[0] || 0;
  const pct = (n: number) => (top > 0 ? Math.round((n / top) * 100) : 0);
  const dropPct = (curr: number, prev: number) =>
    prev > 0 ? Math.max(0, Math.round(((prev - curr) / prev) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      {counts.map((n, i) => {
        const widthPct = top > 0 ? Math.max(2, (n / top) * 100) : 2;
        const conversion = i === 0 ? 100 : pct(n);
        const drop = i === 0 ? 0 : dropPct(n, counts[i - 1] || 0);
        return (
          <div key={i}>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-16 text-gray-600 font-medium">{labels[i] ?? `Step ${i + 1}`}</div>
              <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                <div
                  className="h-full bg-gray-900 transition-all"
                  style={{ width: `${widthPct}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-white mix-blend-difference">
                  {n.toLocaleString()}
                </div>
              </div>
              <div className="w-14 text-right font-mono text-gray-700">{conversion}%</div>
            </div>
            {i > 0 && drop > 0 && (
              <div className="ml-[4.25rem] text-[10px] text-red-500 leading-tight">
                ↓ {drop}% drop
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Inline SVG sparkline-style bar chart. No external dep. */
function BarChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 84, h = 24, gap = 2;
  const barW = (w - gap * (values.length - 1)) / Math.max(1, values.length);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      {values.map((v, i) => {
        const bh = max > 0 ? (v / max) * h : 0;
        const x = i * (barW + gap);
        const y = h - bh;
        return (
          <rect key={i} x={x} y={y} width={barW} height={bh}
            fill={v > 0 ? "#1f2937" : "#e5e7eb"} rx={1} />
        );
      })}
    </svg>
  );
}

/** ISO-3166 alpha-2 → flag emoji. Pure unicode trick, no asset needed. */
function countryFlag(cc: string): string {
  if (cc.length !== 2) return "🌐";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + cc.toUpperCase().charCodeAt(0) - 65,
    base + cc.toUpperCase().charCodeAt(1) - 65,
  );
}
