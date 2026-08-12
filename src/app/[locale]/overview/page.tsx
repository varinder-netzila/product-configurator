"use client";

import { useState, useCallback, Suspense, lazy, useEffect } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import bottleTypesData from "@/data/bottleTypes.json";
import bottleSettingsData from "@/data/bottleSettings.json";
import ErrorBoundary from "@/components/ErrorBoundary";
import Link from "next/link";

const BottleViewer = lazy(() => import("@/components/BottleViewer"));

const ALL_BOTTLES = bottleTypesData.bottleTypes;
const ALL_SETTINGS = bottleSettingsData.bottleSettings as Record<string, any>;

interface BottleOverride {
  colors: Record<string, any>;
}

export default function OverviewPage() {
  const {
    selectedTexture,
    textureOffsetX,
    meshColors: globalColors,
    logoDecals,
    textEngravings,
  } = useConfiguratorStore();

  // Per-bottle color overrides (initialized from global design)
  const [overrides, setOverrides] = useState<Record<string, BottleOverride>>({});
  const [editingBottle, setEditingBottle] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    setReady(true);
    return () => { document.body.style.overflow = ""; document.body.style.height = ""; };
  }, []);

  const getColorsForBottle = useCallback(
    (bottleName: string) => {
      if (overrides[bottleName]) return overrides[bottleName].colors;
      return globalColors;
    },
    [overrides, globalColors]
  );

  const updateBottleColor = useCallback(
    (bottleName: string, component: string, hex: string) => {
      setOverrides((prev) => {
        const current = prev[bottleName]?.colors || { ...globalColors };
        return {
          ...prev,
          [bottleName]: {
            colors: {
              ...current,
              [component]: { hex, name: hex },
            },
          },
        };
      });
    },
    [globalColors]
  );

  const resetBottleColors = useCallback(
    (bottleName: string) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[bottleName];
        return next;
      });
    },
    []
  );

  if (!ready) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Product Overview</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Your design applied to all products. Click a bottle to adjust its colors.
            </p>
          </div>
          <Link
            href="/configurator"
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to configurator
          </Link>
        </div>
      </div>

      {/* Grid of 4 bottles */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_BOTTLES.map((bottle) => {
            const settings = ALL_SETTINGS[bottle.name];
            const colors = getColorsForBottle(bottle.name);
            const isEditing = editingBottle === bottle.name;
            const hasOverride = !!overrides[bottle.name];

            return (
              <div
                key={bottle.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                  isEditing ? "border-gray-900 shadow-xl" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* 3D Viewer */}
                <div
                  className="h-72 sm:h-80 cursor-pointer relative"
                  onClick={() => setEditingBottle(isEditing ? null : bottle.name)}
                >
                  <ErrorBoundary fallback={<div className="w-full h-full flex items-center justify-center"><p className="text-gray-400 text-xs">Failed to load</p></div>}>
                    <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>
                      <BottleViewer
                        modelPath={`${bottle.model}`}
                        selectedColor={colors}
                        selectedTexture={selectedTexture}
                        textureOffsetX={((textureOffsetX || 0) % 1 + 1) % 1}
                        logoDecals={logoDecals}
                        textEngravings={textEngravings}
                        bottleSettings={settings}
                        selectedBottleType={bottle as any}
                        aspectRatio={
                          bottle?.size
                            ? bottle.size.width / bottle.size.height
                            : 1
                        }
                        activeTab="texture"
                        autoRotate
                        hideOverlays
                        cameraPositionOverride={[0, 0.8, 4]}
                        minDistanceOverride={3}
                      />
                    </Suspense>
                  </ErrorBoundary>

                  {hasOverride && (
                    <div className="absolute top-2 right-2 bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Custom
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{bottle.name}</h3>
                      <p className="text-[10px] text-gray-400">{bottle.capacity}</p>
                    </div>
                    <button
                      onClick={() => setEditingBottle(isEditing ? null : bottle.name)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                        isEditing
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {isEditing ? "Done" : "Edit colors"}
                    </button>
                  </div>

                  {/* Color editor */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                      {bottle.components.map((comp) => {
                        const key = comp.charAt(0).toUpperCase() + comp.slice(1);
                        const currentHex = colors[key]?.hex || "#FFFFFF";
                        return (
                          <div key={comp} className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase w-14 flex-shrink-0">
                              {comp}
                            </label>
                            <input
                              type="color"
                              value={currentHex}
                              onChange={(e) => updateBottleColor(bottle.name, key, e.target.value)}
                              className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer flex-shrink-0"
                            />
                            <input
                              type="text"
                              value={currentHex}
                              onChange={(e) => {
                                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
                                  updateBottleColor(bottle.name, key, e.target.value);
                              }}
                              className="flex-1 px-2 py-1 text-[11px] font-mono bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-gray-900"
                            />
                          </div>
                        );
                      })}
                      {hasOverride && (
                        <button
                          onClick={() => resetBottleColors(bottle.name)}
                          className="w-full py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Reset to original design
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
