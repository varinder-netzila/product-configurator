'use client';

import { memo, useCallback, useState } from 'react';
import { BottleType } from '@/types/bottle';
import { useTranslation } from '@/i18n/useTranslation';
import ColorPickerPopup from './ColorPickerPopup';

interface ComponentColorSelectorProps {
  selectedBottleType: BottleType | null;
  colors: any;
  getCurrentColorForComponent: (component: string) => any;
  switchToColorMode: (component: string, color: any) => void;
  setMeshColorForComponent: (component: string, color: any) => void;
}

function checkColor(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff';
}

const ColorSwatch = memo(function ColorSwatch({
  color,
  isSelected,
  onClick,
}: {
  color: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={color.name}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 ${
        isSelected
          ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
          : 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105'
      }`}
      style={{ backgroundColor: color.hex }}
    >
      {isSelected && (
        <svg className="w-3.5 h-3.5" fill="none" stroke={checkColor(color.hex)} strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
});

function ComponentColorSelector({
  selectedBottleType,
  colors,
  getCurrentColorForComponent,
  switchToColorMode,
  setMeshColorForComponent,
}: ComponentColorSelectorProps) {
  const { t } = useTranslation();

  const handleColorClick = useCallback(
    (component: string, color: any) => {
       if (component === 'Body') {
          switchToColorMode(component, color);

       } else if (component === 'Handle') {
      //  selectedBottleType?.components.forEach((comp: string) => {
        //  if (comp !== 'Body' && comp !== 'Frame' && comp !== 'Handle') {
            setMeshColorForComponent(component, color);
        //  }
      //  });
       // setMeshColorForComponent('Handle', color);
      }
    },
    [switchToColorMode, setMeshColorForComponent, selectedBottleType]
  );

  // Which component currently has the custom-Pantone picker open (or null).
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);

  const handleCustomColor = useCallback(
    (component: string, hex: string) => {
      handleColorClick(component, { name: t('configurator.customColorName'), hex });
    },
    [handleColorClick, t]
  );

  if (!selectedBottleType || !colors?.colors) return null;

  const colorList = colors.colors;
  const presetHexes = new Set(colorList.map((c: any) => (c.hex || '').toLowerCase()));
//console.log("selectedBottleType", selectedBottleType);
const mainComponents = (selectedBottleType?.components || []).filter(
  (c: string) =>
    c === "Body" ||
    c === "Handle"
);

  return (
    <div className="space-y-4">
      {mainComponents.map((component: string) => {
        let label = component === 'Body' ? t('configurator.bottleColor') : t('configurator.lidColor');
      //  if(component === 'Frame') label = t('configurator.frameColor');
        const currentColor = getCurrentColorForComponent(component);
        const isCustom = currentColor?.hex && !presetHexes.has(currentColor.hex.toLowerCase());

        return (
          <div key={component}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                {label}
              </span>
              {currentColor && (
                <span className="text-xs text-gray-500">
                  {isCustom ? `${t('configurator.customColorName')} · ${currentColor.hex.toUpperCase()}` : currentColor.name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {colorList.map((color: any, i: number) => (
                <ColorSwatch
                  key={i}
                  color={color}
                  isSelected={currentColor?.hex === color.hex}
                  onClick={() => handleColorClick(component, color)}
                />
              ))}
              {/* Custom Pantone swatch — visible only when a non-preset colour is active. */}
              {isCustom && (
                <button
                  onClick={() => setPickerOpenFor(component)}
                  title={`${t('configurator.customColorName')} · ${currentColor.hex.toUpperCase()}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 ring-2 ring-offset-2 ring-gray-900 scale-110"
                  style={{ backgroundColor: currentColor.hex }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke={checkColor(currentColor.hex)} strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* "Order 500+? Pick your own Pantone" CTA */}
            <button
              type="button"
              onClick={() => setPickerOpenFor(component)}
              className="mt-2 w-full text-left text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
            >
              <span
                className="inline-block w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  background:
                    'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                }}
              />
              <span className="leading-snug">{t('configurator.customColorCta')}</span>
            </button>
          </div>
        );
      })}

      {pickerOpenFor && (
        <ColorPickerPopup
          isOpen={true}
          onClose={() => setPickerOpenFor(null)}
          currentColor={getCurrentColorForComponent(pickerOpenFor)?.hex || '#000000'}
          onColorChange={(hex) => handleCustomColor(pickerOpenFor, hex)}
        />
      )}
    </div>
  );
}

export default memo(ComponentColorSelector);
