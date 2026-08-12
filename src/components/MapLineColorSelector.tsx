'use client';

interface MapLineColorSelectorProps {
  colors: any;
  selectedMapLineColor: any;
  onMapLineColorChange: (color: any) => void;
}

export default function MapLineColorSelector({
  colors,
  selectedMapLineColor,
  onMapLineColorChange
}: MapLineColorSelectorProps) {
  if (!colors || !colors.colors) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="text-sm font-bold text-gray-900 mb-2">Map Line Color</h4>
      <div className="flex md:space-x-2 space-x-0.5 overflow-x-auto scrollbar-hide">
        {colors.colors.map((color: any, colorIndex: number) => (
          <button
            key={colorIndex}
            onClick={() => onMapLineColorChange(color)}
            className={`md:w-8 md:h-8 w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all duration-200 ${
              selectedMapLineColor?.hex === color.hex
                ? 'border-gray-600'
                : 'border-gray-300'
            }`}
            style={{
              backgroundColor: color.hex,
            }}
          >
            {selectedMapLineColor?.hex === color.hex && (
              <svg
                className={`w-4 h-4 ${(() => {
                  // Convert hex to RGB and calculate brightness
                  const hex = color.hex.replace("#", "");
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                  return brightness > 128 ? "text-black" : "text-white";
                })()}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
