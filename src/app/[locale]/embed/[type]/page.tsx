"use client";

import { useEffect, useState, useCallback, useRef, Suspense, lazy } from "react";
import { useParams, useSearchParams } from "next/navigation";
//import bottleTypesData from "@/data/bottleTypes.json";
import { getBottleTypes } from "@/data/bottleTypes";
import bottleSettingsData from "@/data/bottleSettings.json";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTranslation } from "@/i18n/useTranslation";

const BottleViewer = lazy(() => import("@/components/BottleViewer"));

const TYPE_MAP: Record<string, string> = {
  "bottle-500": "IZY Bottle",
  "travel-900": "IZY Travel Bottle",
  "mug-350": "IZY Mug",
  "tumbler-500": "IZY Tumbler",
};

export default function EmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const typeSlug = params.type as string;

  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [showRotateHint, setShowRotateHint] = useState(true);
  const [ready, setReady] = useState(false);
  const [bottleType, setBottleType] = useState<any>(null);

  const { t } = useTranslation();

  const bottleName = TYPE_MAP[typeSlug];

  const bottleSettings = bottleName
    ? (bottleSettingsData.bottleSettings as Record<string, any>)[
        bottleName
      ]
    : null;

  useEffect(() => {
    async function loadBottleTypes() {
      try {
        const data = await getBottleTypes();

        const foundBottle =
          data.bottleTypes.find(
            (b: any) => b.name === bottleName
          ) || null;

        setBottleType(foundBottle);
      } catch (error) {
        console.error("Failed to load bottle types:", error);
      }
    }

    loadBottleTypes();
  }, [bottleName]);
  
  // Build mesh colors from URL params: ?bottle=#C4A4A0&lid=#000000&ring=#C0C0C0
  const meshColors: Record<string, any> = {};
  if (bottleType) {
    for (const comp of bottleType.components) {
      const hex = searchParams.get(comp);
      if (hex) {
        const cleanHex = hex.startsWith("#") ? hex : `#${hex}`;
        meshColors[comp.charAt(0).toUpperCase() + comp.slice(1)] = {
          hex: cleanHex,
          name: cleanHex,
        };
      }
    }
  }

  // Texture from URL param: ?texture=https://ik.imagekit.io/...
  const textureUrl = searchParams.get("texture") || null;
  const whiteLabel = searchParams.get("whiteLabel") === "true";

  // Listen for postMessage from parent (Shopify) to update colors dynamically
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "setColors" && e.data.colors) {
        // Force re-render by reloading with new params
        const url = new URL(window.location.href);
        for (const [key, val] of Object.entries(e.data.colors as Record<string, string>)) {
          url.searchParams.set(key.toLowerCase(), val);
        }
        window.location.href = url.toString();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Delay render slightly to avoid SSR flash
  useEffect(() => { setReady(true); }, []);

  if (!bottleType || !bottleSettings) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">
          {t("embed.unknownType")} {Object.keys(TYPE_MAP).join(", ")}
        </p>
      </div>
    );
  }

  if (!ready) return <div className="h-screen w-screen bg-white" />;

  return (
    <div
      className="h-screen w-screen bg-white relative overflow-hidden"
      onPointerDown={() => { setIsAutoRotating(false); setShowRotateHint(false); }}
    >
      <ErrorBoundary
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-400 text-sm">{t("viewer.unableToLoad")}</p>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <BottleViewer
            modelPath={`${bottleType.model}`}
            selectedColor={meshColors}
            selectedTexture={textureUrl}
            bottleSettings={bottleSettings}
            selectedBottleType={bottleType as any}
            aspectRatio={
              bottleType?.size
                ? bottleType.size.width / bottleType.size.height
                : 1
            }
            activeTab={textureUrl ? "texture" : "texture"}
            autoRotate={isAutoRotating}
            hideOverlays
            cameraPositionOverride={[0, 0.8, 4]}
            minDistanceOverride={3}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Rotate hint */}
      {showRotateHint && (
        <div className="absolute top-[35%] inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2.5 animate-bounce bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-bold tracking-wide">{t("viewer.rotateMe")}</span>
          </div>
        </div>
      )}

      {/* Subtle IZY branding — bottom right (hidden in white-label mode) */}
      {!whiteLabel && (
        <div className="absolute bottom-3 right-3 z-10 opacity-40 pointer-events-none">
          <span className="text-[10px] font-medium text-gray-400">{t("embed.izyBottles")}</span>
        </div>
      )}
    </div>
  );
}
