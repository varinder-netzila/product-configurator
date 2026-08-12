/**
 * Generates programmatic textures for the All Over Print "templates" feature.
 * Each template draws a pattern using two customizable colors.
 */

export type PrintTemplateId =
  | "solid"
  | "stripes-vertical"
  | "stripes-horizontal"
  | "stripes-diagonal"
  | "chevron"
  | "gradient-vertical"
  | "gradient-radial"
  | "dots"
  | "checkered"
  | "waves";

export interface PrintTemplate {
  id: PrintTemplateId;
  label: string;
  defaultPrimary: string;
  defaultSecondary: string;
}

export const PRINT_TEMPLATES: PrintTemplate[] = [
  { id: "solid", label: "Solid", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "stripes-vertical", label: "Stripes V", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "stripes-horizontal", label: "Stripes H", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "stripes-diagonal", label: "Diagonal", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "chevron", label: "Chevron", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "gradient-vertical", label: "Gradient", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "gradient-radial", label: "Radial", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "dots", label: "Dots", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "checkered", label: "Checkered", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
  { id: "waves", label: "Waves", defaultPrimary: "#000000", defaultSecondary: "#ffffff" },
];

/**
 * Generate a print template texture as a data URL.
 * @param templateId Which template to draw
 * @param primary Primary color (hex)
 * @param secondary Secondary color (hex)
 * @param width Canvas width (default 2048 to match bottle wrap)
 * @param height Canvas height (computed from aspect ratio if not provided)
 * @param aspectRatio Bottle aspect ratio (width / height)
 */
export function generatePrintTemplate(
  templateId: PrintTemplateId,
  primary: string,
  secondary: string,
  aspectRatio: number = 1,
  width: number = 2048,
): string {
  const height = Math.round(width / aspectRatio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Base fill
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, width, height);

  switch (templateId) {
    case "solid":
      // Already filled
      break;

    case "stripes-vertical": {
      const stripeCount = 12;
      const stripeWidth = width / stripeCount;
      ctx.fillStyle = secondary;
      for (let i = 1; i < stripeCount; i += 2) {
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, height);
      }
      break;
    }

    case "stripes-horizontal": {
      const stripeCount = 12;
      const stripeHeight = height / stripeCount;
      ctx.fillStyle = secondary;
      for (let i = 1; i < stripeCount; i += 2) {
        ctx.fillRect(0, i * stripeHeight, width, stripeHeight);
      }
      break;
    }

    case "stripes-diagonal": {
      // Seamless diagonal stripes: (x + y) mod period.
      // Width must be an integer multiple of period to wrap without seams.
      const stripeCount = 16; // 2048/16 = 128 exactly
      const period = width / stripeCount;
      const stripeWidth = period / 2;
      const sec = secondary.replace("#", "");
      const sr = parseInt(sec.slice(0, 2), 16);
      const sg = parseInt(sec.slice(2, 4), 16);
      const sb = parseInt(sec.slice(4, 6), 16);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = (x + y) % period;
          if (d < stripeWidth) {
            const idx = (y * width + x) * 4;
            data[idx] = sr;
            data[idx + 1] = sg;
            data[idx + 2] = sb;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      break;
    }

    case "chevron": {
      // Symmetric V shapes — inherently seamless because they mirror around chevron centers.
      const chevronCount = 8; // 2048/8 = 256 exactly
      const chevronWidth = width / chevronCount;
      const stripePeriod = 96;
      const stripeWidth = stripePeriod / 2;
      const sec = secondary.replace("#", "");
      const sr = parseInt(sec.slice(0, 2), 16);
      const sg = parseInt(sec.slice(2, 4), 16);
      const sb = parseInt(sec.slice(4, 6), 16);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const xInChevron = x % chevronWidth;
          const tri = Math.abs(xInChevron - chevronWidth / 2);
          const d = (tri + y) % stripePeriod;
          if (d < stripeWidth) {
            const idx = (y * width + x) * 4;
            data[idx] = sr;
            data[idx + 1] = sg;
            data[idx + 2] = sb;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      break;
    }

    case "gradient-vertical": {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case "gradient-radial": {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.5,
      );
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case "dots": {
      const dotRadius = width * 0.025;
      const spacing = width * 0.08;
      ctx.fillStyle = secondary;
      for (let y = spacing / 2; y < height; y += spacing) {
        const offset = Math.round(y / spacing) % 2 === 0 ? 0 : spacing / 2;
        for (let x = spacing / 2 + offset; x < width; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "checkered": {
      const cells = 10;
      const cellW = width / cells;
      const cellH = cellW; // square cells
      const rows = Math.ceil(height / cellH);
      ctx.fillStyle = secondary;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cells; c++) {
          if ((r + c) % 2 === 1) {
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }
      break;
    }

    case "waves": {
      ctx.fillStyle = secondary;
      const waveCount = 8;
      const waveHeight = height / waveCount;
      const amplitude = waveHeight * 0.4;
      const frequency = 4;
      for (let i = 0; i < waveCount; i += 2) {
        ctx.beginPath();
        const yBase = i * waveHeight;
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= width; x += 8) {
          const y = yBase + Math.sin((x / width) * Math.PI * 2 * frequency) * amplitude;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, yBase + waveHeight);
        for (let x = width; x >= 0; x -= 8) {
          const y =
            yBase + waveHeight + Math.sin((x / width) * Math.PI * 2 * frequency) * amplitude;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }

  return canvas.toDataURL("image/png", 1.0);
}

/** Generate a small thumbnail (for UI swatches) */
export function generatePrintTemplateThumbnail(
  templateId: PrintTemplateId,
  primary: string,
  secondary: string,
  size: number = 64,
): string {
  return generatePrintTemplate(templateId, primary, secondary, 1, size);
}
