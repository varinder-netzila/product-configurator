import { BrandDesign } from '@/types/brand';

const SIZE = 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

function removeBackground(img: HTMLImageElement, tolerance = 60): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imageData.data;
  const corners = [0, (c.width - 1) * 4, (c.height - 1) * c.width * 4, ((c.height - 1) * c.width + (c.width - 1)) * 4];
  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  for (const idx of corners) {
    if (d[idx + 3] > 200) { bgR += d[idx]; bgG += d[idx + 1]; bgB += d[idx + 2]; count++; }
  }
  if (count === 0) return c;
  bgR = Math.round(bgR / count); bgG = Math.round(bgG / count); bgB = Math.round(bgB / count);
  const isLight = bgR > 200 && bgG > 200 && bgB > 200;
  const isDark = bgR < 55 && bgG < 55 && bgB < 55;
  if (!isLight && !isDark) return c;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - bgR) < tolerance && Math.abs(d[i + 1] - bgG) < tolerance && Math.abs(d[i + 2] - bgB) < tolerance) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return c;
}

/**
 * Parse the LOGO_AREA comment from SVG to find where to place the logo.
 * Returns { cx, cy, size } in pixel coordinates, or a default position.
 */
function parseLogoArea(svg: string): { cx: number; cy: number; size: number } {
  const match = svg.match(/LOGO_AREA\s+cx="(\d+(?:\.\d+)?)"\s+cy="(\d+(?:\.\d+)?)"\s+size="(\d+(?:\.\d+)?)"/);
  if (match) {
    return {
      cx: parseFloat(match[1]),
      cy: parseFloat(match[2]),
      size: parseFloat(match[3]),
    };
  }
  // Default: center-top area
  return { cx: 512, cy: 200, size: 180 };
}

/**
 * Sample the average brightness of a region on the canvas.
 * Returns 0 (black) to 1 (white).
 */
function sampleBrightness(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): number {
  const x = Math.max(0, Math.round(cx - size / 2));
  const y = Math.max(0, Math.round(cy - size / 2));
  const w = Math.min(Math.round(size), SIZE - x);
  const h = Math.min(Math.round(size), SIZE - y);
  if (w <= 0 || h <= 0) return 0.5;
  const data = ctx.getImageData(x, y, w, h).data;
  let total = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    total += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return total / pixels;
}

/**
 * Invert the colors of a canvas image (dark ↔ light).
 */
function invertCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];       // R
    d[i + 1] = 255 - d[i + 1]; // G
    d[i + 2] = 255 - d[i + 2]; // B
    // Alpha stays the same
  }
  ctx.putImageData(imageData, 0, 0);
  return c;
}

/**
 * Get the average brightness of a logo canvas (ignoring transparent pixels).
 */
function logoBrightness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let total = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 50) continue; // skip transparent
    total += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    count++;
  }
  return count > 0 ? total / count : 0.5;
}

/**
 * Rasterize an SVG data URL to a 1024x1024 PNG, then composite the logo on top.
 * Automatically inverts the logo if it would be invisible against the background.
 */
export async function rasterizeSvg(svgDataUrl: string, logoDataUrl?: string | null, svgSource?: string, logoScale: number = 1): Promise<string> {
  const img = await loadImage(svgDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  // Safety net: fill with white so any transparency in the source PNG/SVG
  // doesn't make the bottle look see-through. Brand AI images can sometimes
  // return semi-transparent backgrounds despite the opaque flag.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  // Composite logo if available
  if (logoDataUrl) {
    try {
      const logoImg = await loadImage(logoDataUrl);
      let cleanLogo = removeBackground(logoImg);
      const area = svgSource ? parseLogoArea(svgSource) : { cx: 512, cy: 200, size: 180 };

      // Check if logo is visible against the background
      const bgBrightness = sampleBrightness(ctx, area.cx, area.cy, area.size);
      const lgBrightness = logoBrightness(cleanLogo);

      // If both are dark (<0.4) or both are light (>0.6), invert the logo
      const bothDark = bgBrightness < 0.4 && lgBrightness < 0.4;
      const bothLight = bgBrightness > 0.6 && lgBrightness > 0.6;
      if (bothDark || bothLight) {
        cleanLogo = invertCanvas(cleanLogo);
      }

      let lw = cleanLogo.width, lh = cleanLogo.height;
      const maxSize = area.size * logoScale;
      if (lw > maxSize || lh > maxSize) {
        const s = maxSize / Math.max(lw, lh);
        lw *= s;
        lh *= s;
      }

      ctx.drawImage(cleanLogo, area.cx - lw / 2, area.cy - lh / 2, lw, lh);
    } catch {
      // Logo failed to load, continue without it
    }
  }

  return canvas.toDataURL('image/png');
}

export function getBrandTextureUrl(design: BrandDesign): string {
  return design.imageDataUrl;
}

export async function generateBrandPreviews(designs: BrandDesign[], logoDataUrl?: string | null, logoScale: number = 1): Promise<string[]> {
  const previews: string[] = [];
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 256;
  previewCanvas.height = 256;
  const previewCtx = previewCanvas.getContext('2d')!;

  for (const design of designs) {
    try {
      // Rasterize with logo at full size, then scale down for preview
      const fullPng = await rasterizeSvg(design.imageDataUrl, logoDataUrl, (design as any).svg, logoScale);
      const fullImg = await loadImage(fullPng);
      previewCtx.clearRect(0, 0, 256, 256);
      previewCtx.drawImage(fullImg, 0, 0, 256, 256);
      previews.push(previewCanvas.toDataURL('image/png'));
    } catch {
      previewCtx.clearRect(0, 0, 256, 256);
      previewCtx.fillStyle = '#f3f4f6';
      previewCtx.fillRect(0, 0, 256, 256);
      previewCtx.fillStyle = '#9ca3af';
      previewCtx.font = '14px sans-serif';
      previewCtx.textAlign = 'center';
      previewCtx.fillText('Failed to load', 128, 128);
      previews.push(previewCanvas.toDataURL('image/png'));
    }
  }
  return previews;
}
