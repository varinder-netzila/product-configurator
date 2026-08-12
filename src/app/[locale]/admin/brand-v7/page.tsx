"use client";

import { useState } from "react";
import AdminNav from "@/components/AdminNav";

interface Design {
  name: string;
  imageDataUrl: string;
}
interface V7Response {
  designs?: Design[];
  pipeline?: { version: number; engine: string; fullPrompt: string; usedLogoRef: boolean };
  error?: string;
}

const EXAMPLE_PROMPT = `MIMIC THE STYLE, COMPOSITION, AND ENERGY OF THE PROVIDED REFERENCE IMAGE (if attached) precisely. Translate that exact visual world into a bottle wrap for SailGP.

Design a cinematic premium bottle wrap label for SailGP — the international foiling catamaran race series. The design must feel like a movie poster for elite sailing: dramatic black-and-white photography of foiling catamarans, layered triangular photo panels, urgent typography, and selective red accents. NOT a flat graphic — a layered editorial composition.

RENDER QUALITY: hyper-detailed, sharp focus, premium print finish, magazine-cover sharpness, crisp edges, no soft / painted look. 4K editorial quality.

PALETTE — use EXACTLY these hex values, do NOT shift or substitute:
- Background fill: deep dark navy gradient from #0A0E1A (top) to #1A2238 (bottom) — RICH, DEEP, fully saturated dark navy, NOT washed-out grey-blue.
- Primary accent: vivid bright red #E10600 — fully saturated, vibrant, almost neon. Used for diagonal speed stripes, the word "FUTURE.", and "A BETTER FUTURE".
- White: pure #FFFFFF used at high contrast for all primary typography.
- Photography: pure black-and-white with crushed deep blacks and bright highlights — NOT grey/foggy, but high contrast monochrome.

EVERY colour mention must be applied with full saturation. Avoid muted, washed-out, or pastel tones — this is a high-impact athletic editorial, not a soft minimal design.

CANVAS LAYOUT (1024×1024, all focal elements between y=200 and y=850):

1. LEFT EDGE — vertical typography: bold italic white display sans-serif spelling "SAIL GP" running floor-to-ceiling along the left edge, rotated 90° counter-clockwise. Slightly cropped at the edge for an editorial feel.

2. RIGHT EDGE — vertical typography (mirrored): the same "SAIL GP" bold italic white display sans-serif running floor-to-ceiling along the right edge, rotated 90° clockwise.

3. CENTRE-LEFT BODY (around x=180, y=350): stacked typography reading
   POWER.
   SPEED.
   FUTURE.
   — bold uppercase white display sans-serif, generous line-height, with the final "FUTURE." in red #E10600.

4. CENTRE (around x=512, y=420): a large dark CIRCULAR world-map silhouette — continents shown in subtle medium-grey textured fill against the navy background. Approximately 380px diameter.

5. OVER THE CIRCLE (centered, y=440): "SAIL GP" in massive bold italic white display sans-serif as the dominant brand mark, slightly overlapping the top of the circle.

6. UNDER THE BRAND MARK (centered, y=540): "RACE FOR" in small-caps white, then below on the next line "A BETTER FUTURE" in small-caps italic red #E10600.

7. LOWER CENTRE BODY (y=600 to y=800): two angled TRIANGULAR PHOTO PANELS containing dramatic black-and-white photography of foiling SailGP-style catamarans cutting through ocean water at high speed — tall mainsails visible, white water spray, low-angle dynamic perspective, dramatic backlit sky. The triangular masks intersect each other at sharp angles.

8. DECORATIVE DIAGONAL STRIPES: short bright red #E10600 diagonal stripes (3 stripes, ~140px long, ~10px thick) clustered in the upper-right and bottom-left corners of the body zone — speed-mark accents.

9. TOPOGRAPHIC TEXTURE: subtle white topographic line-contours at 15% opacity flowing horizontally across the lower mid-section as decorative ocean-depth texture.

10. RED TOPOGRAPHIC LINE-CURVE running along the very bottom edge of the body zone (just above the bottom safe zone) — wavy contour lines in red.

MOOD: cinematic, premium, urgent, future-forward, elite athletic, motion-blur energy, racing-poster art direction.

REFERENCE AESTHETIC: dark sports editorial design, Formula 1 commemorative posters, premium yacht racing magazine spreads.`;

export default function BrandV7TestPage() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT);
  const [n, setN] = useState(1);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<V7Response | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refImageName, setRefImageName] = useState<string>("");

  const handleRefUpload = (file: File) => {
    setRefImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setRefImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const run = async () => {
    setLoading(true);
    setResult(null);
    setElapsed(0);
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500);
    try {
      const res = await fetch("/api/brand/analyze-v7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          n,
          useLogoAsRef: !!refImage,
          logoDataUrl: refImage,
        }),
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
          <h1 className="text-2xl font-bold text-gray-900">Brand AI — v7 POC (prompt-mode) · build {process.env.NEXT_PUBLIC_BUILD_ID || "local"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Write a dense, specific design prompt like you would in ChatGPT. Optionally upload a reference image
            (e.g. the design you want to mimic) — it will be passed to gpt-image-1&apos;s /edits endpoint as a visual
            style anchor. We wrap your prompt in the bottle safe-zone rules and call gpt-image-1 quality=high.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
            Design prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 leading-relaxed"
            placeholder="Describe the design in detail — colours, typography, composition, focal elements, mood…"
          />
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold text-gray-700">
              Variations:
              <select
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
                className="ml-2 px-2 py-1 text-sm border border-gray-200 rounded bg-white"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              Reference image (optional):
              <span className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50">
                {refImage ? "Replace" : "Upload"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => e.target.files?.[0] && handleRefUpload(e.target.files[0])}
                className="hidden"
              />
            </label>
            {refImage && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <img src={refImage} alt="" className="w-10 h-10 object-cover rounded border border-gray-200" />
                <span className="truncate max-w-[160px]">{refImageName}</span>
                <button
                  onClick={() => { setRefImage(null); setRefImageName(""); }}
                  className="text-red-500 hover:text-red-700"
                >×</button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setPrompt(EXAMPLE_PROMPT)}
                className="text-xs text-gray-500 hover:text-gray-900"
              >
                Reset to SailGP example
              </button>
              <button
                onClick={run}
                disabled={loading || !prompt.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40"
              >
                {loading ? `Generating… ${elapsed}s` : `Generate ${n} ${n === 1 ? "design" : "designs"}`}
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 text-sm text-gray-500">
            gpt-image-1 quality=high — usually 25–40s per image, ran in parallel.
          </div>
        )}

        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700">
            <strong>Error:</strong> {result.error}
          </div>
        )}

        {result?.designs && (
          <div className={`grid grid-cols-1 ${result.designs.length === 1 ? "" : result.designs.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4 mb-6`}>
            {result.designs.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <img src={d.imageDataUrl} alt={d.name} className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <div className="font-semibold text-sm text-gray-900">{d.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {result?.pipeline?.fullPrompt && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-12">
            <button
              onClick={() => setShowFullPrompt((s) => !s)}
              className="text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              {showFullPrompt ? "▼" : "▶"} Full prompt sent to gpt-image-1 (your text + safe-zone rules)
            </button>
            {showFullPrompt && (
              <pre className="mt-3 text-[11px] text-gray-600 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                {result.pipeline.fullPrompt}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
