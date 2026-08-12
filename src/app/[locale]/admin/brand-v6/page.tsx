"use client";

import { useState } from "react";
import AdminNav from "@/components/AdminNav";

interface Design {
  name: string;
  imageDataUrl: string;
}
interface V6Response {
  brand?: { companyName: string; primaryColor: string; secondaryColor: string; accentColor: string; logoUrl?: string };
  designs?: Design[];
  pipeline?: {
    version: number;
    engine: string;
    fingerprint?: any;
    imagePrompts?: { name: string; prompt: string; usedLogoRef: boolean }[];
  };
  error?: string;
}

export default function BrandV6TestPage() {
  const [url, setUrl] = useState("https://sailgp.com");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<V6Response | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setElapsed(0);
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500);
    try {
      const res = await fetch("/api/brand/analyze-v6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message || "Request failed" });
    } finally {
      clearInterval(tick);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <AdminNav />

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Brand AI — v6 POC</h1>
          <p className="text-sm text-gray-500 mt-1">
            Test the all-OpenAI pipeline (gpt-4o + gpt-image-1 quality=high). Existing v4 is not affected.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex gap-3 items-center">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourbrand.com"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900"
          />
          <button
            onClick={run}
            disabled={loading || !url.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {loading ? `Generating… ${elapsed}s` : "Generate 3 designs"}
          </button>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 text-sm text-gray-500">
            Running gpt-4o brain + 3 parallel gpt-image-1 calls at quality=high. Usually 40–90s.
          </div>
        )}

        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700">
            <strong>Error:</strong> {result.error}
          </div>
        )}

        {result?.brand && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              {result.brand.logoUrl && (
                <img src={result.brand.logoUrl} alt="" className="w-14 h-14 object-contain rounded-md border border-gray-200 bg-white p-1" />
              )}
              <div>
                <div className="text-lg font-bold text-gray-900">{result.brand.companyName}</div>
                <div className="text-xs text-gray-500">v{result.pipeline?.version} · {result.pipeline?.engine}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {[result.brand.primaryColor, result.brand.secondaryColor, result.brand.accentColor].map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: c }} title={c} />
                    <code className="text-[10px] text-gray-500">{c}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {result?.designs && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {result.designs.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <img src={d.imageDataUrl} alt={d.name} className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <div className="font-semibold text-sm text-gray-900">{d.name}</div>
                  {result.pipeline?.imagePrompts?.[i] && (
                    <div className="text-[10px] text-gray-500 mt-1">
                      {result.pipeline.imagePrompts[i].usedLogoRef ? "✓ logo as reference" : "no logo ref"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {result?.pipeline?.imagePrompts && result.pipeline.imagePrompts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
            <button
              onClick={() => setShowPrompts((s) => !s)}
              className="text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              {showPrompts ? "▼" : "▶"} What GPT-4o sent to gpt-image-1 ({result.pipeline.imagePrompts.length} prompts)
            </button>
            {showPrompts && (
              <div className="mt-4 space-y-4">
                {result.pipeline.imagePrompts.map((p, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="text-xs font-bold text-gray-700 mb-2">{i + 1}. {p.name}</div>
                    <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{p.prompt}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {result?.pipeline?.fingerprint && (
          <details className="bg-white rounded-2xl border border-gray-200 p-4 mb-12">
            <summary className="text-sm font-semibold text-gray-700 cursor-pointer">Brand fingerprint (GPT-4o output)</summary>
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-mono mt-3 leading-relaxed">
              {JSON.stringify(result.pipeline.fingerprint, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
