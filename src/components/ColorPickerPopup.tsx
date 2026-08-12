"use client";

import { useState, useEffect, useRef } from "react";

// Accurate color conversion utilities
const hslToHex = (hsl: { h: number; s: number; l: number }): string => {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

interface ColorPickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onColorChange: (color: string) => void;
}

export default function ColorPickerPopup({
  isOpen,
  onClose,
  currentColor,
  onColorChange,
}: ColorPickerPopupProps) {
  // Initialize color from currentColor
  const parseColor = (hex: string) => {
    if (!hex) return { h: 0, s: 100, l: 50 };
    const hsl = hexToHsl(hex);
    return hsl || { h: 0, s: 100, l: 50 };
  };

  const [color, setColor] = useState(() => parseColor(currentColor));
  const [hexInput, setHexInput] = useState(currentColor.toUpperCase() || "#000000");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  // Update color when currentColor prop changes
  useEffect(() => {
    if (currentColor) {
      const hsl = parseColor(currentColor);
      setColor(hsl);
      setHexInput(currentColor.toUpperCase());
    }
  }, [currentColor]);

  // Update hex when color changes
  useEffect(() => {
    const hex = hslToHex(color);
    setHexInput(hex);
  }, [color]);

  // Draw accurate color gradient on canvas
  useEffect(() => {
    if (!isOpen) return; // Don't draw if popup is closed
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw saturation/lightness gradient
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const s = (x / width) * 100;
        const l = 100 - (y / height) * 100;
        
        // Convert HSL to RGB
        const h = color.h / 360;
        const sNorm = s / 100;
        const lNorm = l / 100;

        let r, g, b;
        if (sNorm === 0) {
          r = g = b = lNorm;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };

          const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
          const p = 2 * lNorm - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }

        const index = (y * width + x) * 4;
        data[index] = Math.round(r * 255);
        data[index + 1] = Math.round(g * 255);
        data[index + 2] = Math.round(b * 255);
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [color.h, isOpen]); // Added isOpen to redraw when popup opens

  // Convert hex to CMYK
  const hexToCMYK = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { c: 0, m: 0, y: 0, k: 0 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const k = 1 - Math.max(r, g, b);
    const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
    const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
    const y = k === 1 ? 0 : (1 - b - k) / (1 - k);

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;

    const s = (x / width) * 100;
    const l = 100 - (y / height) * 100;

    setColor({ ...color, s: Math.max(0, Math.min(100, s)), l: Math.max(0, Math.min(100, l)) });
  };

  const handleCanvasMouseDown = () => {
    isDragging.current = true;
  };

  const handleCanvasMouseUp = () => {
    isDragging.current = false;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    handleCanvasClick(e);
  };

  const handleHueSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newHue = (x / rect.width) * 360;
    setColor({ ...color, h: Math.max(0, Math.min(360, newHue)) });
  };

  const handleHueSliderTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const newHue = (x / rect.width) * 360;
    setColor({ ...color, h: Math.max(0, Math.min(360, newHue)) });
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    if (/^#?[0-9A-F]{6}$/i.test(value)) {
      const normalizedHex = value.startsWith('#') ? value : `#${value}`;
      const hsl = hexToHsl(normalizedHex);
      if (hsl) {
        setColor(hsl);
      }
    }
  };

  const handleContinue = () => {
    const hex = hslToHex(color);
    onColorChange(hex);
    onClose();
  };

  const cmyk = hexToCMYK(hexInput);
  const currentHex = hslToHex(color);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 w-full max-w-md mx-auto">
        {/* Color Gradient Area - Canvas for accurate color rendering */}
        <div className="w-full h-48 md:h-64 rounded-xl md:rounded-2xl mb-3 md:mb-4 relative overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={300}
            height={200}
            className="w-full h-full cursor-pointer border border-gray-300 rounded-xl md:rounded-2xl"
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onMouseMove={handleCanvasMouseMove}
            onTouchStart={handleCanvasMouseDown}
            onTouchEnd={handleCanvasMouseUp}
            onTouchMove={(e) => {
              if (!isDragging.current || !canvasRef.current) return;
              const touch = e.touches[0];
              const rect = canvasRef.current.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              const width = rect.width;
              const height = rect.height;
              const s = (x / width) * 100;
              const l = 100 - (y / height) * 100;
              setColor({ ...color, s: Math.max(0, Math.min(100, s)), l: Math.max(0, Math.min(100, l)) });
            }}
          />
          {/* Color Picker Circle - shows the actual selected color */}
          <div
            className="absolute w-5 h-5 md:w-6 md:h-6 border-2 md:border-4 border-white rounded-full pointer-events-none z-10"
            style={{
              left: `${color.s}%`,
              top: `${100 - color.l}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: hslToHex(color),
              boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
            }}
          />
        </div>

        {/* Hue Slider */}
        <div className="mb-3 md:mb-4 relative">
          <div
            className="w-full h-6 md:h-8 rounded-full cursor-pointer relative touch-none"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
            onClick={handleHueSliderClick}
            onTouchStart={handleHueSliderTouch}
          >
            {/* Hue Slider Circle */}
            <div
              className="absolute w-5 h-5 md:w-6 md:h-6 border-2 md:border-4 border-white rounded-full pointer-events-none"
              style={{
                left: `${(color.h / 360) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: hslToHex({ ...color, s: 100, l: 50 }),
                boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        </div>

        {/* HEX Input */}
        <div className="mb-3 md:mb-4">
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <span className="text-sm md:text-base font-bold text-black">HEX</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value.toUpperCase())}
              className="text-sm md:text-base font-semibold px-2 py-1.5 border-2 border-gray-300 rounded-full text-center w-28 md:w-32 focus:outline-none focus:border-gray-600 text-black"
              maxLength={7}
            />
          </div>
        </div>

        {/* CMYK Values */}
        <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3 md:mb-4">
          <div className="text-center">
            <div className="text-sm md:text-base font-bold mb-0.5 md:mb-1 text-black">C</div>
            <div className="px-1 py-1 md:px-2 md:py-1.5 border-2 border-gray-300 rounded-full">
              <span className="text-xs md:text-base font-semibold text-black">{cmyk.c}%</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-base font-bold mb-0.5 md:mb-1 text-black">M</div>
            <div className="px-1 py-1 md:px-2 md:py-1.5 border-2 border-gray-300 rounded-full">
              <span className="text-xs md:text-base font-semibold text-black">{cmyk.m}%</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-base font-bold mb-0.5 md:mb-1 text-black">Y</div>
            <div className="px-1 py-1 md:px-2 md:py-1.5 border-2 border-gray-300 rounded-full">
              <span className="text-xs md:text-base font-semibold text-black">{cmyk.y}%</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-base font-bold mb-0.5 md:mb-1 text-black">K</div>
            <div className="px-1 py-1 md:px-2 md:py-1.5 border-2 border-gray-300 rounded-full">
              <span className="text-xs md:text-base font-semibold text-black">{cmyk.k}%</span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full bg-black text-white py-2.5 md:py-3 rounded-full text-sm md:text-base font-bold hover:bg-gray-800 transition-colors"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
