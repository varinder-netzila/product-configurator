import {
  JerseyDesign,
  JerseyFont,
  JerseyPattern,
  JerseySubPattern,
  JerseySubDirection,
  JERSEY_FONTS,
} from "@/data/jerseyPresets";

/**
 * Compute texture dimensions matching the product's circumference-to-height
 * aspect ratio. Keeps the smaller side at BASE_DIM so wide products get a
 * wider canvas (mug/tumbler) and tall products get a taller canvas (bottle).
 *
 * All internal coordinates are proportional to TEX_W / TEX_H so the layout
 * looks consistent across products.
 */
const BASE_DIM = 1024;

function getTextureDims(aspectRatio: number): { w: number; h: number } {
  // Clamp to a sensible range so a bad input doesn't blow up canvas memory.
  const a = Math.max(0.4, Math.min(3, aspectRatio || 1));
  if (a >= 1) return { w: Math.round(BASE_DIM * a), h: BASE_DIM };
  return { w: BASE_DIM, h: Math.round(BASE_DIM / a) };
}

// ── Font loading ──────────────────────────────────────────────────────────────

const _loadedFonts = new Set<string>();

/** Injects a Google Fonts <link> and waits for the font to be usable in canvas. */
async function ensureFont(font: JerseyFont): Promise<void> {
  if (_loadedFonts.has(font.id)) return;
  _loadedFonts.add(font.id);

  if (font.googleUrl) {
    const existing = document.querySelector(`link[href="${font.googleUrl}"]`);
    if (!existing) {
      const link = document.createElement("link");
      link.rel  = "stylesheet";
      link.href = font.googleUrl;
      document.head.appendChild(link);
    }
  }

  // Wait until the font is actually available for canvas rendering.
  // Use the numeric weight from the font def; fall back to 400.
  try {
    await document.fonts.load(`${font.weight} 48px ${font.family}`);
  } catch {
    // Non-fatal — canvas will fall back to the next family in the stack.
  }
}

/** Builds a ctx.font string for the given JerseyFont and pixel size. */
function ctxFont(font: JerseyFont, size: number): string {
  return `${font.weight} ${size}px ${font.family}`;
}

// ── Canvas singleton ──────────────────────────────────────────────────────────
// Avoids creating a new DOM element on every debounced call.
let _offscreen: HTMLCanvasElement | null = null;

function acquireCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!_offscreen) _offscreen = document.createElement("canvas");
  _offscreen.width  = w;
  _offscreen.height = h;
  const ctx = _offscreen.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  return [_offscreen, ctx];
}


// ── Spaced text ───────────────────────────────────────────────────────────────
// Canvas 2D has no letterSpacing property – must space characters manually.

function _drawSpacedChars(
  ctx: CanvasRenderingContext2D,
  mode: "fill" | "stroke",
  text: string,
  cx: number,
  cy: number,
  spacing: number,
) {
  const chars = Array.from(text); // handles multi-byte chars
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    if (mode === "fill") ctx.fillText(chars[i], x + widths[i] / 2, cy);
    else                 ctx.strokeText(chars[i], x + widths[i] / 2, cy);
    x += widths[i] + spacing;
  }
}

const fillTextSpaced = (ctx: CanvasRenderingContext2D, t: string, cx: number, cy: number, sp: number) =>
  _drawSpacedChars(ctx, "fill", t, cx, cy, sp);

// ── Colour helpers ────────────────────────────────────────────────────────────

/** Parse a #RRGGBB hex string into [r,g,b]. Returns null if invalid. */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Mix a hex colour toward white (amount=0..1) and return an rgba() string. */
function lighten(hex: string, amount: number, alpha = 1): string {
  const rgb = hexToRgb(hex) ?? [128, 128, 128];
  const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * amount));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Mix a hex colour toward black (amount=0..1) and return an rgba() string. */
function darken(hex: string, amount: number, alpha = 1): string {
  const rgb = hexToRgb(hex) ?? [128, 128, 128];
  const [r, g, b] = rgb.map((c) => Math.round(c * (1 - amount)));
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Decide whether a hex colour reads as "dark" (so we know whether to overlay
 * lighter or darker shadows for the premium gradient).
 */
function isDarkColour(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // ITU-R BT.601 luma
  const luma = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luma < 0.5;
}

// ── Premium enrichment overlays ───────────────────────────────────────────────
//
// These add subtle visual depth to flat parametric panels so the output reads
// as a designed kit rather than a flat colour block — without drawing seams,
// waistbands, hems, or any garment outlines.

/**
 * Soft vertical depth gradient — slightly lighter at the top, slightly darker
 * at the bottom. Mimics ambient studio lighting on a photographed kit.
 */
function addAmbientGradient(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  baseColour: string,
) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  const dark = isDarkColour(baseColour);
  // ~12% lift at top, ~12% drop at bottom — strong enough to read as depth.
  grad.addColorStop(0,    dark ? lighten(baseColour, 0.18, 0.32) : lighten(baseColour, 0.12, 0.30));
  grad.addColorStop(0.5,  "rgba(0,0,0,0)");
  grad.addColorStop(1,    dark ? darken(baseColour, 0.20, 0.32)  : darken(baseColour, 0.15, 0.28));
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Diagonal geometric sublimation pattern overlay at low opacity — gives the
 * sublimated-print feel of a real modern kit without faking fabric texture.
 */
function addSublimatedPattern(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  lineColor: string = "rgba(255,255,255,0.07)",
  spacing: number = 14,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  // 45° diagonal lines spanning the whole panel.
  const start = -h;
  const end = w + h;
  for (let i = start; i < end; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Thin vertical accent stripes along the outer left/right edges of a panel
 * (Adidas-style side panel). The main stripe is paired with an even thinner
 * trim stripe immediately inside it, giving two-tone visual depth.
 */
function addSidePanels(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  mainColor: string,
  trimColor: string,
  inset: number = 0.02,
  thickness: number = 0.025,
) {
  ctx.save();
  const t = w * thickness;
  const tt = w * 0.005; // trim line thickness
  const i = w * inset;
  // Left side: main stripe + trim stripe just inside it
  ctx.fillStyle = mainColor;
  ctx.fillRect(x + i, y, t, h);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x + i + t + w * 0.004, y, tt, h);
  // Right side: mirrored
  ctx.fillStyle = mainColor;
  ctx.fillRect(x + w - i - t, y, t, h);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x + w - i - t - w * 0.004 - tt, y, tt, h);
  ctx.restore();
}

/**
 * Diagonal highlight band at very low opacity — a hint of premium fabric
 * sheen without faking actual fabric texture.
 */
function addSubtleSheen(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0,    "rgba(255,255,255,0)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.04)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.07)");
  grad.addColorStop(0.65, "rgba(255,255,255,0.04)");
  grad.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Apply a 2D blur to a sub-region of the canvas — used to make stripes
 * bleed both horizontally and vertically into each other, replicating
 * sublimated print where the dye diffuses in all directions on the fabric.
 *
 * Cheap: copy the region to an offscreen buffer, draw it back with the
 * canvas blur filter applied.
 */
function blur2D(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  blurPx: number,
) {
  if (blurPx <= 0) return;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;
  offCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(off, 0, 0, w, h, x, y, w, h);
  ctx.restore();
}

/**
 * Add a subtle vertical tonal variation within the existing pattern — top
 * slightly darker, bottom slightly lighter (or vice versa). Mimics the way
 * dye absorption varies on a real sublimated jersey, giving each stripe a
 * faint inner gradient instead of looking like flat-colour vector blocks.
 */
function addPerStripeShading(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0,    "rgba(0,0,0,0.10)");
  grad.addColorStop(0.45, "rgba(0,0,0,0)");
  grad.addColorStop(0.55, "rgba(0,0,0,0)");
  grad.addColorStop(1,    "rgba(255,255,255,0.06)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Convert a sub-pattern direction to gradient endpoints within the panel.
 * Returns [x0, y0, x1, y1] — the line from start to end of the gradient.
 */
function dirToEndpoints(
  dir: JerseySubDirection,
  x: number, y: number, w: number, h: number,
): [number, number, number, number] {
  switch (dir) {
    case "top-left":     return [x,     y,     x + w, y + h];
    case "top-right":    return [x + w, y,     x,     y + h];
    case "bottom-left":  return [x,     y + h, x + w, y];
    case "bottom-right": return [x + w, y + h, x,     y];
    default:             return [x,     y,     x,     y + h]; // top-to-bottom
  }
}

/**
 * Render an overlay matching the kit's unique design feature (a Barcelona-style
 * diagonal sweep, a PSG-style color block, etc.) on top of the base pattern.
 * All overlays are drawn at moderate opacity so the underlying stripes/hoops
 * still read through.
 */
function addSubPattern(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  subPattern: JerseySubPattern,
  direction: JerseySubDirection,
  primary: string,
  secondary: string,
  accent: string,
) {
  if (subPattern === "none") return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (subPattern === "diagonal-gradient") {
    // Barcelona 25/26-style sweep: dark→light along a diagonal. Uses a
    // darken/lighten of the primary so it reads as "the same fabric in
    // different light" rather than a different colour zone.
    // Strong alpha + larger tonal range so the sweep reads through the
    // base stripe pattern and the photographic finish layers on top.
    const [x0, y0, x1, y1] = dirToEndpoints(direction === "none" ? "top-right" : direction, x, y, w, h);
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0,    darken(primary,  0.45, 0.80));
    grad.addColorStop(0.5,  "rgba(0,0,0,0)");
    grad.addColorStop(1,    lighten(primary, 0.35, 0.70));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  } else if (subPattern === "vertical-fade") {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, darken(primary, 0.40, 0.70));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  } else if (subPattern === "color-block") {
    // Strong colour block in the secondary/accent — fills roughly half the
    // panel from one corner.
    const useAccent = isDarkColour(primary) ? accent : secondary;
    const [x0, y0, x1, y1] = dirToEndpoints(direction === "none" ? "top-right" : direction, x, y, w, h);
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0,    useAccent);
    grad.addColorStop(0.45, useAccent);
    grad.addColorStop(0.6,  "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.90;
    ctx.fillRect(x, y, w, h);
  } else if (subPattern === "geometric-mesh") {
    // A repeating triangular mesh — sublimated, low contrast, decorative.
    ctx.strokeStyle = isDarkColour(primary)
      ? "rgba(255,255,255,0.10)"
      : "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1.2;
    const spacing = Math.max(18, Math.round(w * 0.04));
    for (let i = -h; i < w + h; i += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + i + h, y);
      ctx.lineTo(x + i, y + h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Cached procedural textures ───────────────────────────────────────────────
// These are expensive to generate so we build them once at module load and
// reuse via CanvasPattern.

let _grainPattern: CanvasPattern | null = null;
let _meshPattern: CanvasPattern | null = null;

/** Build a tileable random-noise canvas — used for photographic grain. */
function buildGrainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = 192;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const c = off.getContext("2d");
  if (!c) return null;
  const img = c.createImageData(size, size);
  // Monochrome noise centred around mid-grey with mild deviation.
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + Math.floor((Math.random() - 0.5) * 90);
    img.data[i]     = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return ctx.createPattern(off, "repeat");
}

/** Build a tileable jersey-knit mesh dot pattern. */
function buildMeshPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = 6;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const c = off.getContext("2d");
  if (!c) return null;
  c.fillStyle = "rgba(0,0,0,0)";
  c.fillRect(0, 0, size, size);
  // Tiny dot offset every other row — staggered like knit holes.
  c.fillStyle = "rgba(0,0,0,0.42)";
  c.beginPath();
  c.arc(1.5, 1.5, 0.55, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(4.5, 4.5, 0.55, 0, Math.PI * 2);
  c.fill();
  return ctx.createPattern(off, "repeat");
}

/**
 * Fine monochrome grain overlay — instantly reads as "photograph" rather
 * than "vector graphic". Multiplied at very low opacity using soft-light
 * blending so it tints rather than overwrites the underlying colour.
 */
function addGrain(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  alpha: number = 0.06,
) {
  if (!_grainPattern) _grainPattern = buildGrainPattern(ctx);
  if (!_grainPattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = _grainPattern;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Jersey-knit mesh texture — small staggered dots that read as fabric
 * perforations. Extremely subtle but lifts the whole image into "real
 * sports fabric" territory.
 */
function addMeshTexture(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  alpha: number = 0.10,
) {
  if (!_meshPattern) _meshPattern = buildMeshPattern(ctx);
  if (!_meshPattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = _meshPattern;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Radial vignette darkening at the corners — gives a "photographed flat lay"
 * finish where the corners fall off slightly into shadow.
 */
function addEdgeVignette(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  strength: number = 0.18,
) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(w, h) * 0.65;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ── Pattern drawing ───────────────────────────────────────────────────────────

function drawPattern(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  primary: string, secondary: string,
  pattern: JerseyPattern,
  stripeCount: number = 5,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Base fill
  ctx.fillStyle = primary;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = secondary;

  // stripeCount = number of pairs (primary + secondary), clamped for safety
  const pairs = Math.max(1, Math.min(20, stripeCount));

  switch (pattern) {
    case "solid":
      break;

    case "stripes-vertical": {
      // Continuous multi-stop gradient PER HORIZONTAL BAND — each band has
      // its stripe positions shifted by a small sinusoidal X-offset so the
      // pattern wobbles slightly along the Y axis. After a 2D blur is
      // applied later, the band edges blend together and the stripes appear
      // to "flow" / bleed vertically, just like a real sublimated jersey
      // where dye crosses fibres organically.
      const total = pairs * 2;
      const sw = 1 / total;
      const solidHalf = sw * 0.30;
      const bands = 12; // more bands = smoother flow
      const wobbleAmp = sw * 0.18; // ±18% of stripe width — visible but not crazy
      for (let b = 0; b < bands; b++) {
        const bandY = y + (b * h) / bands;
        const bandH = h / bands + 1; // +1 to avoid 1-px gaps from rounding
        // Sine wobble; phase makes each band drift in a different direction.
        const offset = Math.sin((b / bands) * Math.PI * 2.0) * wobbleAmp;
        const grad = ctx.createLinearGradient(x, bandY, x + w, bandY);
        for (let i = 0; i < total; i++) {
          const center = (i + 0.5) * sw + offset;
          const color = i % 2 === 0 ? primary : secondary;
          grad.addColorStop(Math.max(0, Math.min(1, center - solidHalf)), color);
          grad.addColorStop(Math.max(0, Math.min(1, center + solidHalf)), color);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, bandY, w, bandH);
      }
      break;
    }

    case "stripes-horizontal":
    case "hoops": {
      // Same band-wobble trick as stripes-vertical but rotated 90°: vertical
      // bands of horizontal hoops, each band shifted slightly along Y.
      const total = pairs * 2;
      const sh = 1 / total;
      const solidHalf = sh * 0.30;
      const bands = 12;
      const wobbleAmp = sh * 0.18;
      for (let b = 0; b < bands; b++) {
        const bandX = x + (b * w) / bands;
        const bandW = w / bands + 1;
        const offset = Math.sin((b / bands) * Math.PI * 2.0) * wobbleAmp;
        const grad = ctx.createLinearGradient(bandX, y, bandX, y + h);
        for (let i = 0; i < total; i++) {
          const center = (i + 0.5) * sh + offset;
          const color = i % 2 === 0 ? primary : secondary;
          grad.addColorStop(Math.max(0, Math.min(1, center - solidHalf)), color);
          grad.addColorStop(Math.max(0, Math.min(1, center + solidHalf)), color);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(bandX, y, bandW, h);
      }
      break;
    }

    case "diagonal": {
      // Proper parallelogram band, top-right → bottom-left at ~45°
      const bw    = w * 0.30;
      const shift = w * 0.38;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.45,          y);
      ctx.lineTo(x + w * 0.45 + bw,     y);
      ctx.lineTo(x + w * 0.45 + bw - shift, y + h);
      ctx.lineTo(x + w * 0.45 - shift,  y + h);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "halves": {
      ctx.fillRect(x + w / 2, y, w / 2, h);
      break;
    }

    case "sash": {
      const sw = w * 0.28;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.36,       y);
      ctx.lineTo(x + w * 0.36 + sw,  y);
      ctx.lineTo(x + w * 0.64,       y + h);
      ctx.lineTo(x + w * 0.64 - sw,  y + h);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "chevron": {
      const midY = y + h * 0.42;
      const d    = h * 0.13;
      ctx.beginPath();
      ctx.moveTo(x,         midY);
      ctx.lineTo(x + w / 2, midY + d);
      ctx.lineTo(x + w,     midY);
      ctx.lineTo(x + w,     midY + d * 2.2);
      ctx.lineTo(x + w / 2, midY + d * 3.2);
      ctx.lineTo(x,         midY + d * 2.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// ── Main texture generator ────────────────────────────────────────────────────

/** Load an image from a URL or data URL, with optional crossOrigin. */
function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function generateJerseyTexture(
  design: JerseyDesign,
  baseImageDataUrl?: string | null,
  aspectRatio: number = 1,
): Promise<string> {
  const fontDef = JERSEY_FONTS.find((f) => f.id === design.fontId) ?? JERSEY_FONTS[0];
  await ensureFont(fontDef);

  // Texture dims match the product's circumference-to-height aspect ratio.
  const { w: TEX_W, h: TEX_H } = getTextureDims(aspectRatio);
  const JERSEY_H = Math.round(TEX_H * 0.60);
  const SHORTS_H = TEX_H - JERSEY_H;
  // Logo / name / number sit at the true centre of each panel half.
  // The bottle model is rotated at render time so that U=0.25 (this point)
  // faces the camera by default, making it the visible front of the bottle.
  const FRONT_CX  = TEX_W * 0.25;
  const BACK_CX   = TEX_W * 0.75;

  const [canvas, ctx] = acquireCanvas(TEX_W, TEX_H);

  const textFill = design.textColor;

  // ── Load assets in parallel ──────────────────────────────────────────────────
  const [logoImg, baseImg] = await Promise.all([
    design.clubLogoUrl ? loadImage(design.clubLogoUrl, true) : Promise.resolve(null),
    baseImageDataUrl   ? loadImage(baseImageDataUrl)         : Promise.resolve(null),
  ]);

  // ── Jersey body ─────────────────────────────────────────────────────────────
  if (baseImg) {
    // Use the real kit body image as the panel content. The Wikipedia kit
    // body images are tall (jersey-shaped) so we CONTAIN-fit (not cover) to
    // avoid cropping shoulder/sleeve features, and fill the surrounding
    // panel area with the kit's primary colour so the design reads as one
    // continuous jersey.
    ctx.fillStyle = design.primaryColor;
    ctx.fillRect(0, 0, TEX_W, JERSEY_H);
    for (const panelX of [0, TEX_W / 2]) {
      const panelW = TEX_W / 2;
      // CONTAIN-fit: scale by the smaller ratio so the image fits inside.
      const scale  = Math.min(panelW / baseImg.width, JERSEY_H / baseImg.height) * 0.95;
      const dw     = baseImg.width  * scale;
      const dh     = baseImg.height * scale;
      const dx     = panelX + (panelW - dw) / 2;
      const dy     = (JERSEY_H - dh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, 0, panelW, JERSEY_H);
      ctx.clip();
      ctx.drawImage(baseImg, dx, dy, dw, dh);
      ctx.restore();
    }
    // Subtle fabric-finish enrichments on top of the kit image — skip side
    // panel stripes & sublimated overlay (the kit image already has them).
    for (const panelX of [0, TEX_W / 2]) {
      const panelW = TEX_W / 2;
      addMeshTexture(ctx, panelX, 0, panelW, JERSEY_H, 0.06);
      addAmbientGradient(ctx, panelX, 0, panelW, JERSEY_H, design.primaryColor);
      addSubtleSheen(ctx, panelX, 0, panelW, JERSEY_H);
      addEdgeVignette(ctx, panelX, 0, panelW, JERSEY_H, 0.12);
      addGrain(ctx, panelX, 0, panelW, JERSEY_H, 0.05);
    }
  } else {
    const pOff = Math.round((design.patternOffset ?? 0) * TEX_W);
    // Draw pattern twice (shifted) to cover the full width with wrapping
    drawPattern(
      ctx, pOff, 0, TEX_W, JERSEY_H,
      design.primaryColor, design.secondaryColor, design.jerseyPattern, design.stripeCount,
    );
    if (pOff > 0) {
      drawPattern(
        ctx, pOff - TEX_W, 0, TEX_W, JERSEY_H,
        design.primaryColor, design.secondaryColor, design.jerseyPattern, design.stripeCount,
      );
    } else if (pOff < 0) {
      drawPattern(
        ctx, pOff + TEX_W, 0, TEX_W, JERSEY_H,
        design.primaryColor, design.secondaryColor, design.jerseyPattern, design.stripeCount,
      );
    }

    // ── Premium enrichment — shirt zone ────────────────────────────────────────
    // Layered overlays that add modern kit-design feel. Order matters:
    //   1. sublimated geometric pattern (low-opacity textile depth)
    //   2. shoulder yoke (graphic colour-block at the top — modern colourblocking)
    //   3. chest band on patterns where it doesn't clash
    //   4. side panels (Adidas-style thin outer stripes)
    //   5. ambient gradient (ambient light depth)
    //   6. sheen (faint highlight)
    // Skipped when the user has supplied a base jersey photo.
    // Apply a 2D blur so adjacent colours bleed both horizontally AND
    // vertically — combined with the band-wobble in drawPattern this gives
    // the organic sublimated-print look. Blur radius scales with the stripe
    // width so wide stripes (Barcelona, AC Milan, Argentina) get a soft
    // bleed, while thin pinstripes (Juventus, Inter at high counts) don't
    // get washed out entirely. Halves use the canvas half-width.
    if (
      design.jerseyPattern === "stripes-vertical" ||
      design.jerseyPattern === "stripes-horizontal" ||
      design.jerseyPattern === "hoops" ||
      design.jerseyPattern === "halves"
    ) {
      const pairs = Math.max(1, Math.min(20, design.stripeCount ?? 4));
      const stripePx =
        design.jerseyPattern === "halves"
          ? TEX_W / 2
          : design.jerseyPattern === "hoops" || design.jerseyPattern === "stripes-horizontal"
            ? JERSEY_H / (pairs * 2)
            : TEX_W / (pairs * 2);
      // 18% of stripe width, clamped so very wide patterns don't over-blur
      // and very thin pinstripes still keep the colour pairs separable.
      const blurPx = Math.max(4, Math.min(40, Math.round(stripePx * 0.18)));
      blur2D(ctx, 0, 0, TEX_W, JERSEY_H, blurPx);
    }

    const subPattern = (design.subPattern ?? "none") as JerseySubPattern;
    const subDir = (design.subPatternDirection ?? "none") as JerseySubDirection;

    for (const panelX of [0, TEX_W / 2]) {
      const panelW = TEX_W / 2;
      // 1. Inner stripe shading — subtle top-darker / bottom-lighter that
      //    mimics how a real sublimated dye varies across the fabric.
      addPerStripeShading(ctx, panelX, 0, panelW, JERSEY_H);
      // 2. Fabric texture layers
      addMeshTexture(ctx, panelX, 0, panelW, JERSEY_H, 0.10);
      addSublimatedPattern(ctx, panelX, 0, panelW, JERSEY_H,
        isDarkColour(design.primaryColor) ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        16);
      // 3. Per-kit unique design overlay (Barcelona diagonal sweep, etc.)
      addSubPattern(
        ctx, panelX, 0, panelW, JERSEY_H,
        subPattern, subDir,
        design.primaryColor, design.secondaryColor,
        design.accentColor ?? design.secondaryColor,
      );
      // 4. Side panel stripes — accentColor as the trim line.
      const sideTrim = design.accentColor ?? design.textColor;
      addSidePanels(ctx, panelX, 0, panelW, JERSEY_H,
        design.secondaryColor, sideTrim, 0.025, 0.022);
      // 5. Photographic finish layers
      addAmbientGradient(ctx, panelX, 0, panelW, JERSEY_H, design.primaryColor);
      addSubtleSheen(ctx, panelX, 0, panelW, JERSEY_H);
      addEdgeVignette(ctx, panelX, 0, panelW, JERSEY_H, 0.12);
      addGrain(ctx, panelX, 0, panelW, JERSEY_H, 0.05);
    }
  }

  // Logo / text sizes are anchored to BASE_DIM (the shorter canvas side, i.e.
  // 1024) rather than TEX_W so wide products (mug/tumbler) don't blow them
  // up out of proportion. Horizontal POSITIONS still use TEX_W because they
  // scale with the panel width.

  // ── Club logo — front left chest (lower half of jersey) ─────────────────────
  if (logoImg) {
    const size = BASE_DIM * 0.1172; // 120px @ BASE_DIM=1024
    ctx.drawImage(logoImg, FRONT_CX - size * 1.1, JERSEY_H * 0.40, size, size);
  }

  // ── Front number — right chest (lower half of jersey) ───────────────────────
  if (design.playerNumber) {
    const fs = Math.round(BASE_DIM * 0.072);
    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    ctx.fillText(design.playerNumber, FRONT_CX + TEX_W * 0.078, JERSEY_H * 0.47);
    ctx.restore();
  }

  // ── Back name ───────────────────────────────────────────────────────────────
  // Name + number sit with a 0.23 gap between their centres on JERSEY_H.
  if (design.playerName) {
    const fs      = Math.round(BASE_DIM * 0.054);
    const nameStr = design.playerName.toUpperCase();

    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    fillTextSpaced(ctx, nameStr, BACK_CX, JERSEY_H * 0.50, 3);
    ctx.restore();
  }

  // ── Back number (large) ─────────────────────────────────────────────────────
  if (design.playerNumber) {
    const fs = Math.round(BASE_DIM * 0.1758); // 180px @ BASE_DIM=1024

    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    ctx.fillText(design.playerNumber, BACK_CX, JERSEY_H * 0.73);
    ctx.restore();
  }

  // ── Shorts ──────────────────────────────────────────────────────────────────
  {
    const pOff = Math.round((design.patternOffset ?? 0) * TEX_W);
    drawPattern(
      ctx, pOff, JERSEY_H, TEX_W, SHORTS_H,
      design.shortsColor, design.secondaryColor, design.shortsPattern, design.stripeCount,
    );
    if (pOff > 0) {
      drawPattern(
        ctx, pOff - TEX_W, JERSEY_H, TEX_W, SHORTS_H,
        design.shortsColor, design.secondaryColor, design.shortsPattern, design.stripeCount,
      );
    } else if (pOff < 0) {
      drawPattern(
        ctx, pOff + TEX_W, JERSEY_H, TEX_W, SHORTS_H,
        design.shortsColor, design.secondaryColor, design.shortsPattern, design.stripeCount,
      );
    }

    // ── Premium enrichment — shorts zone ──────────────────────────────────────
    // Shorts always use the parametric path (even when the shirt uses a kit
    // image base), so enrichments run unconditionally for visual consistency
    // across the bottom 40% of the texture.
    for (const panelX of [0, TEX_W / 2]) {
      const panelW = TEX_W / 2;
      addMeshTexture(ctx, panelX, JERSEY_H, panelW, SHORTS_H, 0.09);
      addSublimatedPattern(ctx, panelX, JERSEY_H, panelW, SHORTS_H,
        isDarkColour(design.shortsColor) ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
        16);
      addSidePanels(ctx, panelX, JERSEY_H, panelW, SHORTS_H,
        design.secondaryColor, design.primaryColor, 0.03, 0.028);
      addAmbientGradient(ctx, panelX, JERSEY_H, panelW, SHORTS_H, design.shortsColor);
      addSubtleSheen(ctx, panelX, JERSEY_H, panelW, SHORTS_H);
      addEdgeVignette(ctx, panelX, JERSEY_H, panelW, SHORTS_H, 0.13);
      addGrain(ctx, panelX, JERSEY_H, panelW, SHORTS_H, 0.06);
    }
  }

  // Shirt → shorts transition: a thin accent strip in the primary colour
  // separates the kit-image (or parametric) shirt zone from the parametric
  // shorts zone.
  {
    const strip = SHORTS_H * 0.035;
    ctx.fillStyle = design.primaryColor;
    ctx.fillRect(0, JERSEY_H - strip * 0.5, TEX_W, strip);
  }

  // Shorts number and logo share the same vertical centre, placed
  // symmetrically around FRONT_CX so they read as a balanced pair.
  // Sizes anchored to BASE_DIM (constant across products); horizontal
  // offset stays anchored to TEX_W so it scales with the panel width.
  const shortsLogoSize = BASE_DIM * 0.0625; // 64px @ BASE_DIM=1024
  const shortsOffset   = TEX_W * 0.065;
  // On the mug (aspect ≈ 1.92, very wide & short) the bottom of the body
  // curves into the base, hiding the lower part of the shorts. Lift the
  // shorts logo + number into the visible area there. Other products keep
  // the standard mid-shorts position.
  const shortsCYRatio  = aspectRatio >= 1.8 ? 0.28 : 0.42;
  const shortsCY       = JERSEY_H + SHORTS_H * shortsCYRatio;

  // ── Shorts number — left thigh ───────────────────────────────────────────────
  if (design.playerNumber) {
    const fs = Math.round(BASE_DIM * 0.060); // 50% larger than the previous 0.040
    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    ctx.fillText(design.playerNumber, FRONT_CX - shortsOffset, shortsCY);
    ctx.restore();
  }

  // ── Shorts logo — right thigh ────────────────────────────────────────────────
  if (logoImg) {
    ctx.drawImage(
      logoImg,
      FRONT_CX + shortsOffset - shortsLogoSize / 2,
      shortsCY - shortsLogoSize / 2,
      shortsLogoSize,
      shortsLogoSize,
    );
  }

  return canvas.toDataURL("image/png");
}

/**
 * Overlay player name, number, and club logo onto an AI-generated jersey image.
 *
 * The AI image already represents the full kit (shirt top 60%, shorts bottom 40%,
 * front on the left half, back on the right half). We only need to add the
 * personalisation layer on top using the same proportional positions the
 * parametric generator uses.
 *
 * Returns a data URL; if the AI image fails to load (e.g. CORS), falls back
 * to the URL itself so the texture still shows even without name/number.
 */
export async function compositeAIJersey(
  aiImageUrl: string,
  design: JerseyDesign,
  aspectRatio: number = 1,
): Promise<string> {
  const fontDef = JERSEY_FONTS.find((f) => f.id === design.fontId) ?? JERSEY_FONTS[0];
  await ensureFont(fontDef);

  const [aiImg, logoImg] = await Promise.all([
    loadImage(aiImageUrl, true),
    design.clubLogoUrl ? loadImage(design.clubLogoUrl, true) : Promise.resolve(null),
  ]);
  if (!aiImg) return aiImageUrl; // CORS / network failure — at least show the raw AI image.

  const { w: TEX_W, h: TEX_H } = getTextureDims(aspectRatio);
  const JERSEY_H = Math.round(TEX_H * 0.60);
  const SHORTS_H = TEX_H - JERSEY_H;
  // True centre of each panel half — bottle rotates to put U=0.25 at the front.
  const FRONT_CX  = TEX_W * 0.25;
  const BACK_CX   = TEX_W * 0.75;

  const [canvas, ctx] = acquireCanvas(TEX_W, TEX_H);

  // AI image as full-canvas base — stretches to fit the target aspect.
  ctx.drawImage(aiImg, 0, 0, TEX_W, TEX_H);

  const textFill = design.textColor;

  // Logo / text sizes anchored to BASE_DIM so wide products (mug/tumbler)
  // don't blow them out of proportion; positions still scale with TEX_W.

  // Club logo — front left chest
  if (logoImg) {
    const size = BASE_DIM * 0.1172; // 120px @ BASE_DIM=1024
    ctx.drawImage(logoImg, FRONT_CX - size * 1.1, JERSEY_H * 0.40, size, size);
  }

  // Front number — right chest
  if (design.playerNumber) {
    const fs = Math.round(BASE_DIM * 0.072);
    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    ctx.fillText(design.playerNumber, FRONT_CX + TEX_W * 0.078, JERSEY_H * 0.47);
    ctx.restore();
  }

  // Back name — 0.23 gap to the back number below
  if (design.playerName) {
    const fs      = Math.round(BASE_DIM * 0.054);
    const nameStr = design.playerName.toUpperCase();
    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    fillTextSpaced(ctx, nameStr, BACK_CX, JERSEY_H * 0.50, 3);
    ctx.restore();
  }

  // Back number (large)
  if (design.playerNumber) {
    const fs = Math.round(BASE_DIM * 0.1758); // 180px @ BASE_DIM=1024
    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    ctx.fillText(design.playerNumber, BACK_CX, JERSEY_H * 0.73);
    ctx.restore();
  }

  // Shorts number + logo — same pairing as parametric
  const shortsLogoSize = BASE_DIM * 0.0625; // 64px @ BASE_DIM=1024
  const shortsOffset   = TEX_W * 0.065;
  // On the mug (aspect ≈ 1.92, very wide & short) the bottom of the body
  // curves into the base, hiding the lower part of the shorts. Lift the
  // shorts logo + number into the visible area there. Other products keep
  // the standard mid-shorts position.
  const shortsCYRatio  = aspectRatio >= 1.8 ? 0.28 : 0.42;
  const shortsCY       = JERSEY_H + SHORTS_H * shortsCYRatio;

  if (design.playerNumber) {
    const fs = Math.round(BASE_DIM * 0.060); // 50% larger than the previous 0.040
    ctx.save();
    ctx.font         = ctxFont(fontDef, fs);
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = textFill;
    ctx.fillText(design.playerNumber, FRONT_CX - shortsOffset, shortsCY);
    ctx.restore();
  }

  if (logoImg) {
    ctx.drawImage(
      logoImg,
      FRONT_CX + shortsOffset - shortsLogoSize / 2,
      shortsCY - shortsLogoSize / 2,
      shortsLogoSize,
      shortsLogoSize,
    );
  }

  return canvas.toDataURL("image/png");
}

// ── Pattern preview (used by UI swatches) ─────────────────────────────────────

export function drawPatternPreview(
  canvas: HTMLCanvasElement,
  primary: string,
  secondary: string,
  pattern: JerseyPattern,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width  = 44;
  canvas.height = 44;
  drawPattern(ctx, 0, 0, 44, 44, primary, secondary, pattern);
}
