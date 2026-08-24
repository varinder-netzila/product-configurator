"use client";

import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { BottleType } from "@/types/bottle";
import bottleTypesData from "@/data/bottleTypes.json";
import bottleSettingsData from "@/data/bottleSettings.json";
import colorsBottleMug from "@/data/colors-500ml-bottle-350ml-mug.json";
import colorsTravelTumbler from "@/data/colors-900ml-bottle-500ml-mug.json";
import ErrorBoundary from "@/components/ErrorBoundary";
import { generateMapTextureWithText } from "@/utils/mapTextureGenerator";
import { composeBaseTexture } from "@/utils/layeredTextureComposer";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";

const BottleViewer = lazy(() => import("@/components/BottleViewer"));

const ALL_BOTTLES = bottleTypesData.bottleTypes;
const ALL_SETTINGS = bottleSettingsData.bottleSettings as Record<string, any>;

// Bottle + Mug share one colour palette; Travel Bottle + Tumbler share another.
// Colours must not carry across groups, so each preview uses its own palette's
// default colour when it's in a different group than the selected product.
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

interface ProductSwitcherSidebarProps {
  selectedBottleType: BottleType | null;
  selectedTexture: string | null;
  textureOffsetX: number;
  meshColors: Record<string, any>;
  logoDecals: any[];
  textEngravings: any[];
  activeTab: string;
  mapParams?: MapParams | null;
  onSelectBottle: (bottle: BottleType) => void;
}

export default function ProductSwitcherSidebar({
  selectedBottleType,
  selectedTexture,
  textureOffsetX,
  meshColors,
  logoDecals,
  textEngravings,
  activeTab,
  mapParams,
  onSelectBottle,
}: ProductSwitcherSidebarProps) {
  const wl = useWhiteLabel();
  const [bottleTextures, setBottleTextures] = useState<Record<string, string | null>>({});
  const [generating, setGenerating] = useState(false);

  // Get the OTHER 3 bottles (not the currently selected one)
const otherBottles = selectedBottleType
  ? ALL_BOTTLES.filter(
      (b) => String(b.id) !== String(selectedBottleType.id)
    )
  : ALL_BOTTLES.slice(0, 3);

  // Pre-compute each preview's colours with STABLE references. A new object on
  // every render would re-trigger BottleViewer's heavy scene-processing useMemo
  // (it depends on selectedColor), making the previews very sluggish.
  const thumbColorByBottle = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    if (!selectedBottleType) return map;
    const sourceTravel = isTravelGroup(selectedBottleType.name);
    for (const b of ALL_BOTTLES) {
      if (b.id === selectedBottleType.id) continue;
      if (isTravelGroup(b.name) === sourceTravel) {
        map[b.name] = meshColors;
      } else {
        const d = defaultColorFor(b.name);
        map[b.name] = { Body: d, Frame: d, Handle: d };
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshColors, selectedBottleType?.id, selectedBottleType?.name]);

  // For map designs, regenerate texture per bottle with that bottle's settings.
  // Debounced 400ms so rapid color/title changes don't trigger 3 sequential
  // Mapbox API calls each time.
  useEffect(() => {
    if (activeTab !== "map" || !mapParams?.location) {
      setBottleTextures({});
      return;
    }

    let cancelled = false;
    setGenerating(true);

    async function regenerateAll() {
      const textures: Record<string, string | null> = {};
      for (const bottle of otherBottles) {
        const settings = ALL_SETTINGS[bottle.name];
        const ar = (bottle.size?.width && bottle.size?.height)
          ? bottle.size.width / bottle.size.height
          : 1;
        const texW = 1024;
        const texH = Math.max(2, Math.round(texW / ar));
        const spacing = settings?.spacing || { top: 0, bottom: 0 };

        // Compute explicit canvas dimensions for THIS bottle
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
          const bottleColor = meshColors.Bottle?.hex || meshColors.Mug?.hex || mapParams!.bottleColor;
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

    const timer = setTimeout(() => { regenerateAll(); }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mapParams, selectedBottleType?.id]);

  const getTextureForBottle = (bottleName: string) => {
    if (activeTab === "map" && bottleTextures[bottleName]) {
      return bottleTextures[bottleName];
    }
    return selectedTexture;
  };

  if (!selectedBottleType) return null;

  return (
    <div className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
      {otherBottles.map((bottle) => {
        const settings = ALL_SETTINGS[bottle.name];
        const ar = (bottle.size?.width && bottle.size?.height)
          ? bottle.size.width / bottle.size.height
          : 1;
        const texture = getTextureForBottle(bottle.name);

        const thumbColor = thumbColorByBottle[bottle.name] || meshColors;

        return (
          <button
            key={bottle.id}
            onClick={() => onSelectBottle(bottle as BottleType)}
            className="group relative w-24 h-32 bg-white border-2 border-gray-200 hover:border-gray-900 rounded-xl overflow-hidden transition-all hover:shadow-lg cursor-pointer"
            title={`${wl.productName(bottle.name)} - ${bottle.capacity}`}
          >
            {generating && activeTab === "map" ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <ErrorBoundary fallback={<div className="w-full h-full" />}>
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    </div>
                  }
                >
                  <BottleViewer
                    modelPath={`${bottle.model}`}
                    selectedColor={thumbColor}
                    selectedTexture={texture}
                    textureOffsetX={((textureOffsetX || 0) % 1 + 1) % 1}
                    logoDecals={logoDecals}
                    textEngravings={textEngravings}
                    bottleSettings={settings}
                    selectedBottleType={bottle as any}
                    aspectRatio={ar}
                    activeTab="texture"
                    hideOverlays
                    lowQuality
                    cameraPositionOverride={[0, 0.8, 4]}
                    minDistanceOverride={3}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* Label overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 pointer-events-none">
              <p className="text-[9px] font-bold text-white truncate">{bottle.capacity}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
