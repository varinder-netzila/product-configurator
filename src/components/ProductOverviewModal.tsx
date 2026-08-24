"use client";

import { useState, useCallback, useEffect, useMemo, Suspense, lazy } from "react";
//import bottleTypesData from "@/data/bottleTypes.json";
import { getBottleTypes } from "@/data/bottleTypes";
import bottleSettingsData from "@/data/bottleSettings.json";
import colorsBottleMug from "@/data/colors-500ml-bottle-350ml-mug.json";
import colorsTravelTumbler from "@/data/colors-900ml-bottle-500ml-mug.json";
import ErrorBoundary from "@/components/ErrorBoundary";
import { generateMapTextureWithText } from "@/utils/mapTextureGenerator";
import { composeBaseTexture } from "@/utils/layeredTextureComposer";
import { useTranslation } from "@/i18n/useTranslation";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";

const BottleViewer = lazy(() => import("@/components/BottleViewer"));


const ALL_SETTINGS = bottleSettingsData.bottleSettings as Record<string, any>;

// Bottle + Mug share one colour palette; Travel Bottle + Tumbler share another.
// Colours must not carry across groups, so a product in a different group than
// the source falls back to its own palette default.
const isTravelGroup = (name: string) =>
  name.includes("Travel Bottle") || name.includes("Tumbler");
const defaultColorFor = (name: string) =>
  isTravelGroup(name) ? colorsTravelTumbler.colors[6] : colorsBottleMug.colors[8];


interface MapParams {
  location: { lat: number; lng: number };
  zoom: number;
  title: string;
  subtitle: string;
  lineColor: any;
  bottleColor: string;
  pinLocation: { lat: number; lng: number } | null;
  pinColor: string;
}

interface ProductOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The product the colour was chosen on — used to decide which previews keep
   *  that colour (same palette group) vs. fall back to their own default. */
  sourceBottleName?: string;
  selectedTexture: string | null;
  textureOffsetX: number;
  meshColors: Record<string, any>;
  logoDecals: any[];
  textEngravings: any[];
  activeTab: string;
  mapParams?: MapParams | null;
  colorPalette?: any[];
  whiteLabel?: boolean;
}

export default function ProductOverviewModal({
  isOpen,
  onClose,
  sourceBottleName,
  selectedTexture,
  textureOffsetX,
  meshColors: globalColors,
  logoDecals,
  textEngravings,
  activeTab,
  mapParams,
  colorPalette = [],
}: ProductOverviewModalProps) {
  const wl = useWhiteLabel();
  const whiteLabel = wl.isWhiteLabel;
  const [enlargedBottle, setEnlargedBottle] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<any>(null);
  const [bottleTextures, setBottleTextures] = useState<Record<string, string | null>>({});
  const [generating, setGenerating] = useState(false);

  const { t } = useTranslation();
  const [allBottles, setAllBottles] = useState<any[]>([]);
useEffect(() => {
  async function loadProducts() {
    const data = await getBottleTypes();
    setAllBottles(data.bottleTypes || []);
      if (data.bottleTypes?.length > 0) {
       // setSelectedBottleType(data.bottleTypes[0]);
      }
  }

  loadProducts();
}, []);
const ALL_BOTTLES = allBottles;
  // Regenerate map textures per bottle when modal opens
  useEffect(() => {
    if (!isOpen || activeTab !== "map" || !mapParams?.location) return;

    let cancelled = false;
    setGenerating(true);

    async function regenerateAll() {
      const textures: Record<string, string | null> = {};
      for (const bottle of ALL_BOTTLES) {
        const settings = ALL_SETTINGS[bottle.name];
        const ar = (bottle.size?.width && bottle.size?.height)
          ? bottle.size.width / bottle.size.height
          : 1;
        const texW = 1024;
        const texH = Math.max(2, Math.round(texW / ar));
        const spacing = settings?.spacing || { top: 0, bottom: 0 };

        // Compute explicit canvas dimensions per bottle (don't rely on cache)
        const baseCanvasW = 2048;
        const baseCanvasH = baseCanvasW / ar;
        const mapCanvasWidth = Math.round((baseCanvasW * 2) / 3);
        const mapCanvasHeight = Math.round(baseCanvasH * (1 - spacing.top - spacing.bottom));

        try {
          const mapOverlay = await generateMapTextureWithText({
            location: mapParams!.location,
            zoom: mapParams!.zoom,
            aspectRatio: ar,
            mapTitle: mapParams!.title,
            mapSubtitle: mapParams!.subtitle,
            selectedMapLineColor: mapParams!.lineColor,
            bottleColor: mapParams!.bottleColor,
            spacing,
            mapTextPosition: settings?.mapTextPosition || 0.9,
            mapFonts: settings?.mapFonts,
            pinLocation: mapParams!.pinLocation,
            pinColor: mapParams!.pinColor,
            includeGradient: true,
            mapCanvasWidth,
            mapCanvasHeight,
          });
          const bottleColor = globalColors.Bottle?.hex || globalColors.Mug?.hex || mapParams!.bottleColor;
          const composed = await composeBaseTexture({
            width: texW,
            height: texH,
            bottleColorHex: bottleColor,
            mapLayerDataUrl: mapOverlay,
            output: "png",
          });
          if (!cancelled) textures[bottle.name] = composed;
        } catch {
          textures[bottle.name] = null;
        }
      }
      if (!cancelled) {
        setBottleTextures(textures);
        setGenerating(false);
      }
    }

    regenerateAll();
    return () => { cancelled = true; };
  }, [isOpen, activeTab, mapParams, globalColors]);

  const getTextureForBottle = useCallback(
    (bottleName: string) => {
      if (activeTab === "map" && bottleTextures[bottleName]) {
        return bottleTextures[bottleName];
      }
      return selectedTexture;
    },
    [activeTab, bottleTextures, selectedTexture]
  );

  // Colours per product with STABLE references (a new object each render would
  // re-trigger BottleViewer's heavy scene-processing useMemo). Keep the chosen
  // colour for products in the same palette group as the source; otherwise use
  // that product's own palette default. Accent override applies on top.
  const colorsByBottle = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    for (const b of ALL_BOTTLES) {
      const sameGroup = !sourceBottleName || isTravelGroup(b.name) === isTravelGroup(sourceBottleName);
      let base: Record<string, any>;
      if (sameGroup) {
        base = globalColors;
      } else {
        const d = defaultColorFor(b.name);
        base = { Body: d, Frame: d, Handle: d, };
      }
      map[b.name] = accentColor
        ? { ...base, Body: accentColor, Frame: accentColor, Handle: accentColor }
        : base;
    }
    return map;
  }, [globalColors, accentColor, sourceBottleName]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setEnlargedBottle(null);
      setAccentColor(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const enlargedData = enlargedBottle
    ? ALL_BOTTLES.find((b) => b.name === enlargedBottle)
    : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">{t("overview.title")}</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
              {generating ? t("overview.generatingDesigns") : t("overview.clickToEnlarge")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Accent color picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block">{t("overview.accent")}</span>
              <input
                type="color"
                value={accentColor?.hex || "#FFFFFF"}
                onChange={(e) => setAccentColor({ hex: e.target.value, name: e.target.value })}
                className="w-7 h-7 rounded-full border-2 border-gray-200 cursor-pointer"
                title={t("overview.pickAccentColor")}
              />
              {accentColor && (
                <button
                  onClick={() => setAccentColor(null)}
                  className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {t("common.reset")}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_BOTTLES.map((bottle) => {
            const settings = ALL_SETTINGS[bottle.name];
            const texture = getTextureForBottle(bottle.name);
            const ar = (bottle.size?.width && bottle.size?.height)
              ? bottle.size.width / bottle.size.height
              : 1;
            const pricing = wl.pricing(bottle.name);
            const startingB2B = pricing?.tiers.filter(tier => tier.price > 0).at(-1);

            return (
              <div
                key={bottle.id}
                onClick={() => setEnlargedBottle(enlargedBottle === bottle.name ? null : bottle.name)}
                className="bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-400 overflow-hidden transition-all cursor-pointer hover:shadow-lg"
              >
                <div className="h-64 sm:h-72 lg:h-80 relative">
                  {generating && activeTab === "map" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      <p className="text-[10px] text-gray-400">{t("common.generating")}</p>
                    </div>
                  ) : (
                    <ErrorBoundary fallback={<div className="w-full h-full flex items-center justify-center"><p className="text-gray-400 text-xs">{t("viewer.unableToLoad")}</p></div>}>
                      <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>
                        <BottleViewer
                          modelPath={`${bottle.model}`}
                          selectedColor={colorsByBottle[bottle.name] || globalColors}
                          selectedTexture={texture}
                          textureOffsetX={((textureOffsetX || 0) % 1 + 1) % 1}
                          logoDecals={logoDecals}
                          textEngravings={textEngravings}
                          bottleSettings={settings}
                          selectedBottleType={bottle as any}
                          aspectRatio={ar}
                          activeTab="texture"
                          autoRotate
                          hideOverlays
                          lowQuality
                          cameraPositionOverride={[0, 0.8, 4]}
                          minDistanceOverride={3}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                </div>

                {/* Product info + prices */}
                <div className="px-4 py-3 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">
                    {wl.productName(bottle.name)}
                  </h3>
                  <p className="text-[10px] text-gray-400 mb-2">{bottle.capacity}</p>
                  {!whiteLabel && (
                    <div className="flex items-baseline gap-3">
                      {!pricing || Object.keys(pricing).length === 0 ? (
                        <span className="text-sm font-semibold text-gray-600">op aanvraag</span>
                      ) : (
                        <>
                          <div>
                            <span className="text-sm font-bold text-gray-900">&euro;{(pricing?.retail || bottle.price).toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 ml-1">{t("common.retail")}</span>
                          </div>
                          {startingB2B && (
                            <div>
                              <span className="text-sm font-bold text-green-600">from &euro;{startingB2B.price.toFixed(2)}</span>
                              <span className="text-[10px] text-gray-400 ml-1">{t("common.b2b")}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enlarged view */}
      {enlargedData && (
        <div
          className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 sm:p-8"
          onClick={() => setEnlargedBottle(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[50vh] sm:h-[60vh] relative">
              <ErrorBoundary fallback={<div className="w-full h-full flex items-center justify-center"><p className="text-gray-400">{t("viewer.unableToLoad")}</p></div>}>
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div></div>}>
                  <BottleViewer
                    modelPath={`${enlargedData.model}`}
                    selectedColor={colorsByBottle[enlargedData.name] || globalColors}
                    selectedTexture={getTextureForBottle(enlargedData.name)}
                    textureOffsetX={((textureOffsetX || 0) % 1 + 1) % 1}
                    logoDecals={logoDecals}
                    textEngravings={textEngravings}
                    bottleSettings={ALL_SETTINGS[enlargedData.name]}
                    selectedBottleType={enlargedData as any}
                    aspectRatio={(enlargedData.size?.width && enlargedData.size?.height) ? enlargedData.size.width / enlargedData.size.height : 1}
                    activeTab="texture"
                    autoRotate
                    hideOverlays
                    cameraPositionOverride={[0, 0.8, 4]}
                    minDistanceOverride={3}
                  />
                </Suspense>
              </ErrorBoundary>

              {/* Close button */}
              <button
                onClick={() => setEnlargedBottle(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {wl.productName(enlargedData.name)}
                </h2>
                <div className="text-xs text-gray-400">{enlargedData.capacity} &middot; <div dangerouslySetInnerHTML={{  __html: enlargedData.description || "",
  }}
/></div>
              </div>
              {(() => {
                const p = wl.pricing(enlargedData.name);
                if (!p || Object.keys(p).length === 0) {
                  return (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-600">op aanvraag</span>
                    </div>
                  );
                }
                return (
                  <>
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-[10px] text-gray-400 block">{t("b2b.retailPrice")}</span>
                        <span className="text-base font-bold text-gray-900">&euro;{p.retail.toFixed(2)}</span>
                      </div>
                      {p.tiers.map((tier) => (
                        <div key={tier.label} className="px-3 py-2 bg-green-50 rounded-lg">
                          <span className="text-[10px] text-gray-500 block">{tier.label} {t("common.pcs")}</span>
                          <span className="text-base font-bold text-green-600">&euro;{tier.price.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-[10px] text-gray-400 block">{"1000+ " + t("common.pcs")}</span>
                        <span className="text-xs font-semibold text-gray-500">{t("common.onRequest")}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t("bottleSelector.agentNotice")}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
