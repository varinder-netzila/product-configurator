"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
//import bottleTypesData from "@/data/bottleTypes.json";
import { getBottleTypes } from "@/data/bottleTypes";
import { exportBakedGLB } from "@/utils/glbExporter";

const PRODUCT_TYPES = [
  { slug: "bottle-500", name: "IZY Bottle", components: ["bottle", "lid", "ring"] },
  { slug: "travel-900", name: "IZY Travel Bottle", components: ["bottle", "lid", "handle"] },
  { slug: "mug-350", name: "IZY Mug", components: ["mug", "lid"] },
  { slug: "tumbler-500", name: "IZY Tumbler", components: ["mug", "lid", "straw"] },
];

interface Variant {
  id: string;
  name: string;
  colors: Record<string, string>;
  textureUrl?: string | null;
}

interface ProductConfig {
  slug: string;
  name: string;
  components: string[];
  variants: Variant[];
}

const STORAGE_KEY = "izy-embed-configs";

function loadConfigs(): ProductConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return PRODUCT_TYPES.map((p) => ({
    ...p,
    variants: [
      {
        id: crypto.randomUUID(),
        name: "Default",
        colors: Object.fromEntries(p.components.map((c) => [c, "#FFFFFF"])),
      },
    ],
  }));
}

function saveConfigs(configs: ProductConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

function buildEmbedUrl(baseUrl: string, slug: string, colors: Record<string, string>, textureUrl?: string | null) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(colors)) {
    params.set(key, val);
  }
  if (textureUrl) params.set("texture", textureUrl);
  return `${baseUrl}/embed/${slug}?${params.toString()}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="px-2.5 py-1.5 bg-gray-900 text-white text-[11px] font-semibold rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function defaultConfigs(): ProductConfig[] {
  return PRODUCT_TYPES.map((p) => ({
    ...p,
    variants: [
      {
        id: "default",
        name: "Default",
        colors: Object.fromEntries(p.components.map((c) => [c, "#FFFFFF"])),
      },
    ],
  }));
}

export default function EmbedAdminPage() {
  const [configs, setConfigs] = useState<ProductConfig[]>(defaultConfigs);
  const [hydrated, setHydrated] = useState(false);
  const [activeProduct, setActiveProduct] = useState(0);
  const [activeVariant, setActiveVariant] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);

  // Load from localStorage after hydration
  // useEffect(() => {
  //   const saved = loadConfigs();
  //   if (saved.length) setConfigs(saved);
  //   setHydrated(true);
  // }, []);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://configurator.izybottles.com";

  const product = configs[activeProduct];
  const variant = product?.variants[activeVariant];

  const updateColor = useCallback(
    (component: string, hex: string) => {
      setConfigs((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next[activeProduct].variants[activeVariant].colors[component] = hex;
        saveConfigs(next);
        return next;
      });
      setPreviewKey((k) => k + 1);
    },
    [activeProduct, activeVariant]
  );

  const updateVariantName = useCallback(
    (name: string) => {
      setConfigs((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next[activeProduct].variants[activeVariant].name = name;
        saveConfigs(next);
        return next;
      });
    },
    [activeProduct, activeVariant]
  );

  const [uploading, setUploading] = useState(false);

  const uploadTexture = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

        setConfigs((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          next[activeProduct].variants[activeVariant].textureUrl = data.url;
          saveConfigs(next);
          return next;
        });
        setPreviewKey((k) => k + 1);
      } catch (err) {
        alert("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [activeProduct, activeVariant]
  );

  const removeTexture = useCallback(() => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[activeProduct].variants[activeVariant].textureUrl = null;
      saveConfigs(next);
      return next;
    });
    setPreviewKey((k) => k + 1);
  }, [activeProduct, activeVariant]);

  const [exporting, setExporting] = useState(false);

  const handleDownloadGLB = useCallback(async () => {
    if (!product || !variant) return;
    setExporting(true);
    try {
      const bottleTypesData = await getBottleTypes();
      const modelUrl =
        bottleTypesData.bottleTypes.find(
          (b) => b.name === product.name
        )?.model || "/assets/models/bottle-500.glb";
      // Capitalize component keys to match mesh names
      const capitalizedColors: Record<string, string> = {};
      for (const [key, val] of Object.entries(variant.colors)) {
        capitalizedColors[key.charAt(0).toUpperCase() + key.slice(1)] = val;
      }
      const blob = await exportBakedGLB(modelUrl, capitalizedColors, variant.textureUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${product.slug}-${variant.name.toLowerCase().replace(/\s+/g, "-")}.glb`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("GLB export failed:", err);
      alert("Failed to export GLB. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [product, variant]);

  const addVariant = useCallback(() => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[activeProduct];
      p.variants.push({
        id: crypto.randomUUID(),
        name: `Variant ${p.variants.length + 1}`,
        colors: Object.fromEntries(p.components.map((c: string) => [c, "#FFFFFF"])),
      });
      saveConfigs(next);
      return next;
    });
    setActiveVariant(product.variants.length); // select new one
  }, [activeProduct, product]);

  const removeVariant = useCallback(
    (idx: number) => {
      setConfigs((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next[activeProduct].variants.splice(idx, 1);
        if (next[activeProduct].variants.length === 0) {
          next[activeProduct].variants.push({
            id: crypto.randomUUID(),
            name: "Default",
            colors: Object.fromEntries(
              next[activeProduct].components.map((c: string) => [c, "#FFFFFF"])
            ),
          });
        }
        saveConfigs(next);
        return next;
      });
      setActiveVariant(0);
    },
    [activeProduct]
  );

  const embedUrl = variant ? buildEmbedUrl(baseUrl, product.slug, variant.colors, variant.textureUrl) : "";
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" style="border:none;border-radius:12px;" allow="xr-spatial-tracking"></iframe>`;

  // Export all variants for one product as Shopify-ready JSON
  const shopifyConfig = useMemo(() => {
    if (!product) return "";
    const map: Record<string, Record<string, string>> = {};
    for (const v of product.variants) {
      map[v.name] = v.colors;
    }
    return JSON.stringify(map, null, 2);
  }, [product]);

  // Override the root layout's overflow-hidden on body
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => { document.body.style.overflow = ""; document.body.style.height = ""; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">3D Embed Manager</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure 3D viewer colors for each product variant, then copy the embed code to Shopify
            </p>
          </div>
          <img src="/assets/images/Logo-IZY-800x683-1-edited.webp" alt="IZY" className="h-8" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left: Config */}
          <div className="w-96 flex-shrink-0 space-y-4">
            {/* Product selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                Product
              </label>
              <div className="grid grid-cols-2 gap-2">
                {configs.map((p, idx) => (
                  <button
                    key={p.slug}
                    onClick={() => { setActiveProduct(idx); setActiveVariant(0); setPreviewKey((k) => k + 1); }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${
                      idx === activeProduct
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Variants
                </label>
                <button
                  onClick={addVariant}
                  className="text-[10px] font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
                >
                  + Add variant
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {product?.variants.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setActiveVariant(idx); setPreviewKey((k) => k + 1); }}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all text-left ${
                        idx === activeVariant
                          ? "bg-gray-900 text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex gap-0.5">
                        {Object.values(v.colors).map((hex, ci) => (
                          <div
                            key={ci}
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      {v.name}
                    </button>
                    {product.variants.length > 1 && (
                      <button
                        onClick={() => removeVariant(idx)}
                        className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Color editor */}
            {variant && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Variant name
                  </label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariantName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-900"
                  />
                </div>

                {/* Print file upload */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Print file (bottle wrap texture)
                  </label>
                  {variant.textureUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <img src={variant.textureUrl} alt="Texture" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate flex-1 min-w-0">{variant.textureUrl.split('/').pop()}</span>
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Replace
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTexture(f); e.target.value = ''; }}
                          />
                        </label>
                        <button
                          onClick={removeTexture}
                          className="flex-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-xs font-medium text-gray-500">
                        {uploading ? 'Uploading...' : 'Upload print file (PNG, JPG)'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadTexture(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">The image wraps around the bottle body. Recommended: 1024x1024px PNG.</p>
                </div>

                {product.components.map((comp) => (
                  <div key={comp}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      {comp} color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={variant.colors[comp] || "#FFFFFF"}
                        onChange={(e) => updateColor(comp, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={variant.colors[comp] || "#FFFFFF"}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) updateColor(comp, v);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Preview + Code */}
          <div className="flex-1 space-y-4">
            {/* Live preview */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Live preview</span>
                <span className="text-[10px] text-gray-400 font-mono">{product?.slug}</span>
              </div>
              <div className="h-[500px]">
                {variant && (
                  <iframe
                    key={previewKey}
                    src={buildEmbedUrl("", product.slug, variant.colors, variant.textureUrl)}
                    className="w-full h-full border-0"
                    title="3D Preview"
                  />
                )}
              </div>
            </div>

            {/* Embed code */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    Embed URL
                  </label>
                  <CopyButton text={embedUrl} />
                </div>
                <input
                  type="text"
                  value={embedUrl}
                  readOnly
                  className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    iframe code
                  </label>
                  <CopyButton text={iframeCode} />
                </div>
                <textarea
                  value={iframeCode}
                  readOnly
                  rows={3}
                  className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg outline-none resize-none"
                />
              </div>
            </div>

            {/* Download GLB */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    Download 3D model
                  </label>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    GLB file with baked colors and texture. Upload to Shopify as product 3D model.
                  </p>
                </div>
                <button
                  onClick={handleDownloadGLB}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {exporting ? "Exporting..." : "Download GLB"}
                </button>
              </div>
            </div>

            {/* Shopify variant map */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    All variants — Shopify config
                  </label>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Paste this into your Shopify theme to auto-switch colors on variant change
                  </p>
                </div>
                <CopyButton text={shopifyConfig} />
              </div>
              <pre className="mt-2 px-3 py-2 text-[11px] font-mono bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                {shopifyConfig}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
