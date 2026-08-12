'use client';

import { useState } from 'react';
import { BottleType } from '@/types/bottle';
import { useTranslation } from '@/i18n/useTranslation';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

interface BottleSelectorProps {
  bottleTypes: BottleType[];
  selectedBottleType: BottleType | null;
  onBottleTypeSelect: (bottleType: BottleType) => void;
}

export default function BottleSelector({
  bottleTypes,
  selectedBottleType,
  onBottleTypeSelect
}: BottleSelectorProps) {
  const { t } = useTranslation();
  const wl = useWhiteLabel();
  const [packagingSelection, setPackagingSelection] = useState<Record<string, boolean>>({});
  const accentBorder = wl.reseller?.accentColor ? { borderColor: wl.reseller.accentColor } : undefined;
  // Lowest selling price across tiers for a product (reseller's or IZY's).
  const fromPrice = (izyName: string): string => {
    const p = wl.pricing(izyName);
    const lowest = p?.tiers.filter((tier) => tier.price > 0).at(-1)?.price;
    return lowest != null ? `€${lowest.toFixed(2)}` : t("common.onRequest");
  };

  return (
    <div className="flex flex-row md:flex-col gap-4">
      {wl.showIzyBranding && (
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t("bottleSelector.agentNotice")}</span>
        </div>
      )}
      {bottleTypes.map((bottleType) => (
        <div
          key={bottleType.id}
          onClick={() => onBottleTypeSelect(bottleType)}
          style={selectedBottleType?.id === bottleType.id ? accentBorder : undefined}
          className={`flex items-end justify-between p-2 rounded-xl border cursor-pointer transition-all md:w-full ${
            selectedBottleType?.id === bottleType.id
              ? "border-gray-600 bg-white"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-20 flex rounded-md items-center justify-center transition-all ${
                selectedBottleType?.id === bottleType.id
                  ? "border-gray-600"
                  : "border-gray-200"
              }`}
            >
              <img
                src={`/assets/images/${bottleType.image}`}
                alt={bottleType.name}
                className="w-12 h-12 object-contain transition-all"
                style={{
                  filter: selectedBottleType?.id === bottleType.id
                    ? 'brightness(0) saturate(100%)'
                    : 'brightness(0) saturate(100%) invert(0.85) sepia(0) saturate(0) hue-rotate(0deg) brightness(0.85)'
                }}
              />
            </div>

            <div className="flex flex-col h-28 justify-between py-2">
              <h3
                className={`text-lg font-semibold hidden md:block ${
                  selectedBottleType?.id === bottleType.id
                    ? "text-black"
                    : "text-gray-600"
                }`}
              >
                {wl.productName(bottleType.name)}
              </h3>
              <p
                className={`text-sm font-semibold md:font-normal ${
                  selectedBottleType?.id === bottleType.id
                    ? "text-black"
                    : "text-gray-600"
                }`}
              >
                {bottleType.capacity}
              </p>
              <p
                className={`text-sm font-semibold md:font-normal block md:hidden text-nowrap ${
                  selectedBottleType?.id === bottleType.id
                    ? "text-black"
                    : "text-gray-600"
                }`}
              >
                {t("common.b2c")} €{bottleType.price.toFixed(2)}
              </p>
              <p
                className={`text-sm font-semibold md:font-normal block md:hidden text-nowrap ${
                  selectedBottleType?.id === bottleType.id
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {t("bottleSelector.b2bFrom")} {fromPrice(bottleType.name)}
              </p>
              <p
                className={`text-sm font-semibold md:font-normal hidden md:block ${
                  selectedBottleType?.id === bottleType.id
                    ? "text-black"
                    : "text-gray-600"
                }`}
              >            
              </p>
              <div
  // dangerouslySetInnerHTML={{
  //   __html: bottleType.description || "",
  // }}
/>
            </div>
          </div>
          <div className="items-center hidden md:flex md:flex-col gap-1">
            <div className="bg-gray-100 rounded-lg px-3 py-1 text-sm text-gray-900">
              {t("common.b2c")} €{bottleType.price.toFixed(2)}
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-1 text-sm text-green-700">
              {t("bottleSelector.b2bFrom")} {fromPrice(bottleType.name)}
            </div>
          </div>
        </div>
      ))}

      {wl.reseller?.id === "killerkoozys" && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Custom Packaging</h4>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-2">Sleeve the Giftbox</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">50-99 pcs: <span className="font-semibold">€1.39</span></p>
                  <p className="text-xs text-gray-600">100-249 pcs: <span className="font-semibold">€1.29</span></p>
                  <p className="text-xs text-gray-600">250-499 pcs: <span className="font-semibold">€1.19</span></p>
                  <p className="text-xs text-gray-600">500-999 pcs: <span className="font-semibold">€1.09</span></p>
                  <p className="text-xs text-gray-600">1000+ pcs: <span className="font-semibold">€0.99</span></p>
                </div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
/* Trigger rebuild */
