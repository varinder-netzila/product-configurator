"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BottleType, LogoDecal, TextEngraving } from "@/types/bottle";
import { useTranslation } from "@/i18n/useTranslation";

interface TextureDesignManagerProps {
  selectedBottleType: BottleType;
  selectedColor?: Record<string, any>;
  selectedTexture?: string | null;
  mapImage?: string | null;
  textureOffsetX?: number; // Horizontal offset for all-over print (-0.5 to 0.5)
  hasAllOverPrint?: boolean; // Whether the main layer is an uploaded image
  logoDecals: LogoDecal[];
  textEngravings: TextEngraving[];
  onDownloadDesign: (designDataUrl: string) => void;
  onPreviewGenerated?: (previewUrl: string | null) => void;
}

// Bottle dimensions will be loaded from bottleTypes.json

export default function TextureDesignManager({
  selectedBottleType,
  selectedColor,
  selectedTexture,
  mapImage,
  textureOffsetX = 0,
  hasAllOverPrint = false,
  logoDecals,
  textEngravings,
  onDownloadDesign,
  onPreviewGenerated,
}: TextureDesignManagerProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  // Notify parent component when preview is generated
  useEffect(() => {
    if (onPreviewGenerated) {
      onPreviewGenerated(previewUrl);
    }
  }, [previewUrl, onPreviewGenerated]);

  // Get dimensions for the selected bottle type
  const dimensions = useMemo(() => {
    return selectedBottleType.size || { width: 221.56, height: 238, unit: "mm" };
  }, [selectedBottleType]);

  // Calculate canvas dimensions maintaining aspect ratio
  const canvasDimensions = useMemo(() => {
    const maxSize = 2048;
    const aspectRatio = dimensions.width / dimensions.height;
    
    let width, height;
    if (aspectRatio > 1) {
      width = maxSize;
      height = Math.round(maxSize / aspectRatio);
    } else {
      height = maxSize;
      width = Math.round(maxSize * aspectRatio);
    }
    
    return { width, height };
  }, [dimensions]);

  // Draw texture/map layer onto transparent canvas
  const drawTextureLayer = useCallback(async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // If an all-over image texture is explicitly present and mapImage is NOT active, draw it with offset
    if (selectedTexture && !mapImage && hasAllOverPrint) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => {
          // Calculate horizontal offset in pixels (textureOffsetX is -0.5 to 0.5)
          const offsetX = textureOffsetX * width;
          // Normalize to [0, width) range for wrapping
          const normalizedOffset = ((offsetX % width) + width) % width;
          
          // Draw the image starting at the negative offset (so it wraps)
          // First draw: image starts at -normalizedOffset, fills to width - normalizedOffset
          ctx.drawImage(img, -normalizedOffset, 0, width, height);
          // Second draw: wrap the remaining part from the right side
          if (normalizedOffset > 0) {
            ctx.drawImage(img, width - normalizedOffset, 0, width, height);
          }
          resolve(void 0);
        };
        img.onerror = () => resolve(void 0);
        img.src = selectedTexture;
      });
      return;
    }

    // If a transparent map layer exists, draw it (keep background transparent)
    if (mapImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => { ctx.drawImage(img, 0, 0, width, height); resolve(void 0); };
        img.onerror = () => resolve(void 0);
        img.src = mapImage;
      });
      return;
    }

    // Otherwise draw nothing (transparent)
  }, [selectedTexture, mapImage, textureOffsetX, hasAllOverPrint]);

  // Draw engraving layer (silver text and logos)
  const drawEngravingLayer = useCallback(async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Process logo decals
    for (const logo of logoDecals) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            // Calculate position and scale
            const x = (logo.position.x + 0.5) * width;
            const y = (logo.position.y + 0.5) * height;
            const size = logo.scale * Math.min(width, height) * 0.15;

            // Apply rotation
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(logo.rotation);

            // Create a temporary canvas to process the logo
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw logo to temporary canvas
            tempCtx!.drawImage(img, 0, 0, size, size);
            
            // Get image data from temporary canvas
            const imageData = tempCtx!.getImageData(0, 0, size, size);
            const data = imageData.data;
            
            // Apply mode-specific effects
            if (!logo.mode || logo.mode === 'engraving') {
              // Engraving mode: Apply stainless steel effect
              for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 0) {
                  const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                  const engravingValue = Math.max(0, gray - 128) * 0.6;
                  const shadowValue = Math.max(0, 128 - gray) * 0.4;
                  const stainlessBase = 200;
                  const highlight = Math.min(255, stainlessBase + engravingValue);
                  // Slightly cooler tone
                  data[i] = highlight;
                  data[i + 1] = highlight;
                  data[i + 2] = Math.min(255, highlight + 10);
                }
              }
            }
            
            // Put processed image data back to temporary canvas
            tempCtx!.putImageData(imageData, 0, 0);
            
            // Add subtle shadow for engraving depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            // Draw the processed logo to main canvas
            ctx.drawImage(tempCanvas, -size/2, -size/2, size, size);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.restore();
            
            resolve(void 0);
          };
          img.onerror = () => resolve(void 0); // Continue if logo fails to load
          img.src = logo.imageUrl;
        });
      } catch (error) {
        console.warn('Failed to process logo:', error);
      }
    }

    // Process text engravings
    textEngravings.forEach(text => {
      const x = (text.position.x + 0.5) * width;
      const y = (text.position.y + 0.5) * height;
      const fontSize = text.scale * Math.min(width, height) * 0.08;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(text.rotation);
      
      // Create a temporary canvas for text processing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      // Calculate text dimensions
      tempCtx!.font = `bold ${fontSize}px ${text.fontFamily}`;
      const textMetrics = tempCtx!.measureText(text.text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      
      // Set canvas size with padding for shadow
      const padding = 10;
      tempCanvas.width = textWidth + padding * 2;
      tempCanvas.height = textHeight + padding * 2;
      
      // Set font and draw text to temporary canvas
      tempCtx!.font = `bold ${fontSize}px ${text.fontFamily}`;
      tempCtx!.textAlign = 'center';
      tempCtx!.textBaseline = 'middle';
      
      if (!text.mode || text.mode === 'engraving') {
        // Engraving mode - apply stainless steel effect
        tempCtx!.fillStyle = '#000000';
        tempCtx!.fillText(text.text, tempCanvas.width / 2, tempCanvas.height / 2);
        
        const imageData = tempCtx!.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const engravingValue = Math.max(0, gray - 128) * 0.6;
            const shadowValue = Math.max(0, 128 - gray) * 0.4;
            const stainlessBase = 200;
            const highlight = Math.min(255, stainlessBase + engravingValue);
            data[i] = highlight;
            data[i + 1] = highlight;
            data[i + 2] = Math.min(255, highlight + 10);
          }
        }
        
        tempCtx!.putImageData(imageData, 0, 0);
      } else {
        // Color mode - use the original text color directly
        tempCtx!.fillStyle = text.color || '#000000';
        tempCtx!.fillText(text.text, tempCanvas.width / 2, tempCanvas.height / 2);
      }
      
      // Add subtle shadow for engraving depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // Draw the processed text to main canvas
      ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2, tempCanvas.width, tempCanvas.height);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.restore();
    });
  }, [logoDecals, textEngravings]);

  // Generate the combined texture design
  const generateTextureDesign = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      canvas.width = canvasDimensions.width;
      canvas.height = canvasDimensions.height;

      // Clear to transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. BACKGROUND/TEXTURE LAYER
      // - draw image texture if present and not in map mode
      // - else draw map transparent layer if present
      // - else leave transparent (do NOT draw solid color background)
      await drawTextureLayer(ctx, canvas.width, canvas.height);

      // 2. ENGRAVING LAYER (Silver text and logos)
      if (logoDecals.length > 0 || textEngravings.length > 0) {
        await drawEngravingLayer(ctx, canvas.width, canvas.height);
      }

      // Convert to data URL - PNG with transparency
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(dataUrl);
      onDownloadDesign(dataUrl);
      
    } catch (error) {
      console.error('Error generating texture design:', error);
      // Even on error, generate a transparent PNG to keep flow predictable
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvasDimensions.width;
        canvas.height = canvasDimensions.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const fallbackUrl = canvas.toDataURL('image/png', 1.0);
        setPreviewUrl(fallbackUrl);
      } else {
        setPreviewUrl(null);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [canvasDimensions, drawTextureLayer, drawEngravingLayer, onDownloadDesign, logoDecals, textEngravings]);

  // Generate design when dependencies change
  useEffect(() => {
    generateTextureDesign();
  }, [
    selectedBottleType,
    selectedColor,
    selectedTexture,
    mapImage,
    textureOffsetX,
    hasAllOverPrint,
    logoDecals,
    textEngravings,
    canvasDimensions
  ]);


  return (
    <div className="bg-white rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-bold text-gray-900">
          Preview
        </h3>
        <div className="text-md text-gray-600">
          {dimensions.width}mm × {dimensions.height}mm
        </div>
      </div>

      {/* Preview */}
      <div className="mb-4">
        {previewUrl ? (
          <div
            className="border border-gray-300 overflow-hidden"
            style={{
              backgroundImage: "url('/assets/images/checker.webp')",
              backgroundRepeat: "repeat",
              backgroundSize: "120px 120px",
            }}
          >
            <img
              src={previewUrl}
              alt="Texture Design Preview"
              className="w-full h-auto"
              style={{
                aspectRatio: `${canvasDimensions.width} / ${canvasDimensions.height}`,
                objectFit: 'contain',
                background: 'transparent'
              }}
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            {isGenerating ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">{t("texture.generatingDesign")}</p>
              </div>
            ) : (
              <p className="text-gray-500">{t("texture.noDesign")}</p>
            )}
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => {
            if (previewUrl) {
              const link = document.createElement('a');
              link.download = `texture-design-${selectedBottleType.name.replace(/\s+/g, '-').toLowerCase()}.png`;
              link.href = previewUrl;
              link.click();
            }
          }}
          disabled={!previewUrl || isGenerating}
          className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2"
        >
          {isGenerating ? (
            'GENERATING...'
          ) : (
            <>
              <span>{t("texture.downloadDesign")}</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
