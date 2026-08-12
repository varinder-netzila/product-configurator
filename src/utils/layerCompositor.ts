interface TextureLayer {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  scale: number;
  scaleX?: number;
  scaleY?: number;
  opacity: number;
  rotation: number;
  imageAspectRatio: number;
}

export async function composeLayers(
  layers: TextureLayer[],
  width: number,
  height: number,
  bottleColor?: string
): Promise<string> {
  if (layers.length === 0) {
    // Return bottle color PNG (no layers) or transparent
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx && bottleColor) {
      ctx.fillStyle = bottleColor;
      ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL('image/png');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to create canvas context');

  // Fill with bottle color as background only if provided
  if (bottleColor) {
    ctx.fillStyle = bottleColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Render each layer
  for (const layer of layers) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Save context state
          ctx.save();

          // Calculate position in pixels (-0.5 to 0.5 → pixels)
          const posX = (layer.position.x + 0.5) * width;
          const posY = (layer.position.y + 0.5) * height;

          // Calculate scale in pixels (scale=1 = 25% of canvas width)
          const baseSize = width * 0.25;
          const scaleX = layer.scale * baseSize;
          const scaleY = (layer.scale * baseSize) / layer.imageAspectRatio;

          // Distortion scales (independent X/Y)
          const distortScaleX = layer.scaleX ?? layer.scale;
          const distortScaleY = layer.scaleY ?? layer.scale;
          const scaleXRatio = distortScaleX / layer.scale;
          const scaleYRatio = distortScaleY / layer.scale;

          // Translate to position, rotate, apply distortion, draw
          ctx.translate(posX, posY);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.scale(scaleXRatio, scaleYRatio);
          ctx.globalAlpha = layer.opacity;

          // Draw image centered at (0,0) after translate
          ctx.drawImage(img, -scaleX / 2, -scaleY / 2, scaleX, scaleY);

          // Restore context state
          ctx.restore();

          resolve(void 0);
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${layer.imageUrl}`));
        img.src = layer.imageUrl;
      });
    } catch (error) {
      console.warn(`Failed to render layer ${layer.id}:`, error);
      // Continue with next layer
    }
  }

  return canvas.toDataURL('image/png');
}
