import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ─── Types for the pipeline ──────────────────────────────────────────────────

interface BrandFingerprint {
  companyName: string;
  tagline: string;
  industry: string;
  palette: { primary: string; secondary: string; accent: string; supporting: string[] };
  typography: { family: string; character: string }; // family = Google Fonts name; character = "geometric sans" | "humanist serif" | etc.
  mood: string;                // e.g. "calm, considered, premium"
  designLanguage: string;      // e.g. "Aesop-editorial restraint" / "Patagonia outdoor heritage"
  motifs: string[];            // e.g. ["botanical line drawings", "diagonal grid"]
  visualSignatures: string[];  // SPECIFIC visual moves the brand uses — e.g. Nike: ["swoosh-inspired curves", "implied motion via diagonal lines", "bold sans at scale"]
  whitespace: 'breathing' | 'dense' | 'balanced';
  fontFamily: string;          // back-compat with the frontend type
}

interface DesignDirection {
  name: string;              // brand-specific name (NOT generic Minimalist/Pattern/Editorial)
  styleDescription: string;  // 3-5 sentences of dense, evocative style direction for gpt-image-1
}

// ─── HTML / image helpers (unchanged from v1) ────────────────────────────────

function extractMetaContent(html: string, property: string): string | null {
  const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (ogMatch) return ogMatch[1];
  const ogMatch2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
  if (ogMatch2) return ogMatch2[1];
  const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (nameMatch) return nameMatch[1];
  const nameMatch2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
  if (nameMatch2) return nameMatch2[1];
  return null;
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

/**
 * Returns true when the surrounding HTML around an <img class="logo"> match
 * smells like a partner / client / customer marquee rather than the site's
 * own logo. Agencies (e.g. cocoroco.com) put their clients' logos in
 * <img class="ll-logo-item"> elements, which our naive regex would pick as
 * "the logo" — and we'd then pass a client's brand to gpt-image-1 as a style
 * reference. Filter those out.
 */
function isLikelyClientLogoContext(html: string, idx: number): boolean {
  // Look back ~600 chars from the matched <img> for a wrapper / section that
  // clearly indicates a partner showcase, marquee, or clients band.
  const before = html.slice(Math.max(0, idx - 600), idx).toLowerCase();
  return /\b(marquee|carousel|slider|partner|client|customer|brands?-(?:list|grid|row|strip|wall|showcase)|press[-_]?logos|trusted[-_]?by|featured[-_]?in|as[-_]?seen[-_]?in|portfolio|case[-_]?stud|our[-_]?work)\b/.test(before);
}

function extractLogoUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const domain = new URL(baseUrl).hostname;

  // Head-only slice we can scan for the site's OWN logo (well above any
  // partner-logo marquee further down the page).
  const headSlice = html.slice(0, 8000);

  // 1. <link rel="apple-touch-icon"> with explicit size hint (often the real,
  //    high-res site icon — far more reliable than scraping <img> tags).
  const appleIcons = Array.from(html.matchAll(/<link[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*>/gi))
    .map((mm) => {
      const tag = mm[0];
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      const sizes = tag.match(/sizes=["'](\d+)x\d+["']/i);
      return { href, size: sizes ? Number(sizes[1]) : 0 };
    })
    .filter((x) => x.href);
  // Highest declared size first; fallback to any apple-touch-icon.
  appleIcons.sort((a, b) => b.size - a.size);
  for (const ai of appleIcons) urls.push(resolveUrl(ai.href!, baseUrl));

  // 2. <link rel="icon" type="image/svg+xml"> — SVG favicons are usually the
  //    brand's actual vector mark.
  const svgIcon = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*\.svg)["']/i);
  if (svgIcon) urls.push(resolveUrl(svgIcon[1], baseUrl));
  const svgIcon2 = html.match(/<link[^>]*type=["']image\/svg\+xml["'][^>]*href=["']([^"']*)["']/i);
  if (svgIcon2) urls.push(resolveUrl(svgIcon2[1], baseUrl));

  // 3. PNG <link rel="icon"> at >=128px — also reliable.
  const pngIcons = Array.from(html.matchAll(/<link[^>]*rel=["']icon["'][^>]*>/gi)).map((mm) => {
    const tag = mm[0];
    const href = tag.match(/href=["']([^"']+\.(?:png|webp))["']/i)?.[1];
    const sizes = tag.match(/sizes=["'](\d+)x\d+["']/i);
    return { href, size: sizes ? Number(sizes[1]) : 0 };
  }).filter((x) => x.href && x.size >= 128);
  pngIcons.sort((a, b) => b.size - a.size);
  for (const pi of pngIcons) urls.push(resolveUrl(pi.href!, baseUrl));

  // 4. <img class|id|alt|src ~= "logo"> — but ONLY in the head slice (above
  //    the fold) AND not inside a partner/client/marquee wrapper. This filter
  //    is the key bug fix: it stops us from picking up agency client logos.
  const collectImgMatches = (pattern: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(headSlice)) !== null) {
      if (isLikelyClientLogoContext(headSlice, m.index)) continue;
      urls.push(resolveUrl(m[1], baseUrl));
    }
  };
  collectImgMatches(/<img[^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']*)["']/gi);
  collectImgMatches(/<img[^>]*src=["']([^"']*)["'][^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["']/gi);
  collectImgMatches(/<img[^>]*src=["']([^"']*logo[^"']*)["']/gi);

  // 5. Logo container with embedded <img> — also head-slice + context-filtered.
  const containerPattern = /<(?:a|div|span|header)[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']*)["']/gi;
  let cm: RegExpExecArray | null;
  while ((cm = containerPattern.exec(headSlice)) !== null) {
    if (isLikelyClientLogoContext(headSlice, cm.index)) continue;
    urls.push(resolveUrl(cm[1], baseUrl));
  }

  // 6. Inline SVG inside a logo container (head slice only, no client filter
  //    needed — inline SVG site logos are virtually always the site's own).
  const inlineSvgPattern = /<(?:a|div|span|header)[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?(<svg[\s\S]*?<\/svg>)/gi;
  let sm: RegExpExecArray | null;
  while ((sm = inlineSvgPattern.exec(headSlice)) !== null) {
    if (isLikelyClientLogoContext(headSlice, sm.index)) continue;
    const svgStr = sm[1];
    if (svgStr.length < 50000) {
      const b64 = Buffer.from(svgStr).toString('base64');
      urls.push(`data:image/svg+xml;base64,${b64}`);
    }
  }

  // 7. Brandfetch CDN — historically reliable, now redirects most calls to
  //    their docs page (hotlinking blocked). Kept as a low-priority probe;
  //    fetchAsDataUrl will reject the HTML response anyway.
  urls.push(`https://cdn.brandfetch.io/${domain}/w/512/h/512/logo`);

  // 8. Well-known paths.
  urls.push(`${baseUrl}/logo.png`);
  urls.push(`${baseUrl}/logo.svg`);

  // 9. Google s2 favicon — last resort, tiny but guaranteed to be the site's own.
  urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

  return urls.filter((url, i) => urls.indexOf(url) === i);
}

// ─── OpenAI image generation + ImageKit upload ──────────────────────────────

type ImageResult = { b64: string } | { error: string };

/** Generate a 1024×1024 PNG via OpenAI gpt-image-1. Returns the b64 or a reason. */
async function generateBrandImage(prompt: string): Promise<ImageResult> {
  // .trim() guards against a trailing newline/space pasted into the Vercel
  // env var, which would corrupt the Bearer token and cause a 401.
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('[brand-image] OPENAI_API_KEY not configured');
    return { error: 'OPENAI_API_KEY is not set on the server' };
  }
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        // CRITICAL: force opaque background. gpt-image-1's "auto" default
        // returns transparent PNGs which make the bottle look see-through.
        background: 'opaque',
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[brand-image] OpenAI error', res.status, errText.slice(0, 300));
      return { error: `OpenAI ${res.status}: ${errText.slice(0, 160)}` };
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? { b64 } : { error: 'OpenAI returned no image data' };
  } catch (err: any) {
    console.error('[brand-image] fetch failed', err?.message);
    return { error: `Request failed: ${err?.message || 'unknown'}` };
  }
}

/** Upload a base64 PNG to ImageKit and return its hosted URL. */
async function uploadPngToImageKit(b64: string, name: string): Promise<string | null> {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  if (!privateKey) return null;
  try {
    const auth = Buffer.from(`${privateKey}:`).toString('base64');
    const formData = new FormData();
    formData.append('file', b64);
    formData.append('fileName', `${name}.png`);
    formData.append('folder', '/bottle-designs/brand/');
    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}` },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.url ?? null;
  } catch (err: any) {
    console.error('[brand-image] ImageKit upload failed', err?.message);
    return null;
  }
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BottleConfigurator/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType.split(';')[0]};base64,${base64}`;
  } catch {
    return null;
  }
}

function parseJson(text: string): any {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

// ─── Pipeline step prompts ───────────────────────────────────────────────────

const FINGERPRINT_PROMPT = `You are a senior brand strategist. Given website metadata and any provided images,
extract a RICH brand fingerprint. Return ONLY a valid JSON object with this EXACT shape:

{
  "companyName": "string",
  "tagline": "string — max 60 chars; if no tagline is obvious, write one that captures the brand",
  "industry": "technology|food|fashion|finance|health|sports|education|entertainment|travel|retail|automotive|beauty|hospitality|other",
  "palette": {
    "primary": "#rrggbb",      // dominant brand colour
    "secondary": "#rrggbb",    // secondary brand colour
    "accent": "#rrggbb",       // a contrasting accent
    "supporting": ["#rrggbb", "#rrggbb"]  // 0-3 additional supporting tones the brand uses
  },
  "typography": {
    "family": "Google Fonts name (e.g. Inter, Bebas Neue, Playfair Display, Cormorant Garamond)",
    "character": "very short descriptor — e.g. 'geometric sans', 'humanist serif', 'editorial display'"
  },
  "mood": "3-6 adjectives separated by commas — e.g. 'calm, considered, premium, quietly confident'",
  "designLanguage": "one short sentence comparing this brand's visual language to a recognisable reference, e.g. 'Aesop-style editorial restraint with botanical motifs' or 'Patagonia outdoor heritage with utilitarian typography'",
  "motifs": ["0-4 short descriptors of visual motifs the brand uses, e.g. 'botanical line drawings', 'angled diagonal grids', 'circular badges'"],
  "visualSignatures": ["2-4 SPECIFIC visual moves this brand uses — concrete and actionable for an image generator. Examples: Nike → 'oversized swoosh-inspired curves cutting across compositions', 'implied motion via diagonal speed lines', 'bold sans-serif at extreme scale'. Aesop → 'amber-bottle silhouettes with literary-style typography', 'serif type with generous letter-spacing and breathing whitespace', 'botanical line drawings as decorative borders'. Patagonia → 'mountain-silhouette colour blocks', 'vintage outdoor patches and badges', 'rugged sans-serif with kerning'."],
  "whitespace": "breathing | dense | balanced"
}

For well-known brands use your knowledge of their ACTUAL visual identity. For unknown brands,
infer thoughtfully from any provided image, the tagline, and the industry. Pick colours that
match the brand's true colours — do not invent generic palettes.`;

// ─── Image-generation prompt template ──────────────────────────────────────

function buildBrandImagePrompt(fingerprint: BrandFingerprint, direction: DesignDirection): string {
  const { companyName, tagline, industry, palette, typography, mood, designLanguage, motifs, visualSignatures } = fingerprint;
  return `Design a premium, print-ready bottle wrap label for ${companyName}${industry && industry !== 'other' ? `, a ${industry} brand` : ''}.

THE FEEL: This design must feel unmistakably like a ${companyName} product. ${mood ? `The brand mood is ${mood}.` : ''} ${designLanguage}

DIRECTION FOR THIS VARIANT — "${direction.name}":
${direction.styleDescription}

BRAND PALETTE (use these exact colours, do not invent):
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}
${palette.supporting.length ? `- Supporting tones: ${palette.supporting.join(', ')}` : ''}

TYPOGRAPHY: ${typography.character} feel, similar to ${typography.family}.

${visualSignatures.length ? `BRAND VISUAL SIGNATURES — incorporate these specific visual moves:\n${visualSignatures.map((v) => `- ${v}`).join('\n')}\n` : ''}${motifs.length ? `BRAND MOTIFS that can appear as decorative elements:\n${motifs.map((m) => `- ${m}`).join('\n')}\n` : ''}
COMPOSITION:
- The design wraps 360° around a cylindrical bottle. The LEFT and RIGHT edges must visually connect for a seamless wrap.
- CRITICAL — TOP SAFE ZONE: the top 15% of the canvas (roughly pixels y=0 to y=150) is hidden under the bottle's neck/cap and curves out of view. Treat this zone as decorative background ONLY — NO text, NO brand name, NO logo, NO tagline, NO important graphic elements in the top 15%. Use this zone for pure colour, soft gradients, or pattern background only.
- CRITICAL — BOTTOM SAFE ZONE: the bottom 15% of the canvas (roughly pixels y=870 to y=1024) is hidden under the bottle's base/bottom curve. Treat this zone the same as the top safe zone — NO text, NO brand name, NO logo, NO tagline, NO important graphic elements in the bottom 15%. Background only.
- Place the brand name "${companyName}" and any text in the VISIBLE BODY zone, between roughly y=200 and y=850.
- Feature the brand name "${companyName}" prominently as readable text.
${tagline ? `- The tagline "${tagline}" may appear as a secondary element.` : ''}
- Reserve a clear, balanced area for the company logo (a real logo will be composited on top later) — also in the visible body zone, not at the top.
- The ENTIRE 1024×1024 canvas is filled with a SOLID, OPAQUE background from the brand palette. Every pixel must have a colour. No transparency anywhere.

ABSOLUTELY NO:
- Transparent or semi-transparent background.
- Photo-realistic objects, 3D-rendered items, actual product imagery.
- Pictures of people, faces, body parts, animals.
- Any image of a bottle, mug, can, or other physical container in the design.
- Speech bubbles, watermarks, signatures, dates.

Output: a flat 2D graphic design with an opaque background, ready to print onto a curved surface. Authentically ${companyName} — not generic.`;
}

// ─── Pipeline steps ──────────────────────────────────────────────────────────

interface FingerprintInput {
  domain: string;
  title: string;
  description: string;
  themeColor: string;
  ogImageBase64: string | null;
  ogImageMimeType: string;
  logoBase64: string | null;
  logoMimeType: string;
  fetchFailed: boolean;
}

async function step1_fingerprint(
  client: Anthropic,
  input: FingerprintInput,
): Promise<BrandFingerprint> {
  const content: any[] = [];
  if (input.ogImageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: input.ogImageMimeType, data: input.ogImageBase64 },
    });
  }
  if (input.logoBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: input.logoMimeType, data: input.logoBase64 },
    });
  }

  const ctxLines = [
    `Domain: ${input.domain}`,
    input.title ? `Title: ${input.title}` : '',
    input.description ? `Description: ${input.description}` : '',
    input.themeColor ? `Theme colour from meta: ${input.themeColor}` : '',
    input.fetchFailed ? '(Website fetch failed — use your knowledge of this brand if you recognise it.)' : '',
  ].filter(Boolean).join('\n');
  content.push({ type: 'text', text: ctxLines || `Domain: ${input.domain}` });

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1200,
    system: FINGERPRINT_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const parsed = parseJson(raw);
  if (!parsed?.companyName) throw new Error('Fingerprint step failed to return valid JSON');

  // Validate / coerce
  const hex = /^#[0-9a-fA-F]{6}$/;
  const fixHex = (v: any, fallback: string) =>
    typeof v === 'string' && hex.test(v) ? v.toLowerCase() : fallback;

  return {
    companyName: String(parsed.companyName),
    tagline: String(parsed.tagline || ''),
    industry: String(parsed.industry || 'other'),
    palette: {
      primary: fixHex(parsed.palette?.primary, '#1a1a2e'),
      secondary: fixHex(parsed.palette?.secondary, '#16213e'),
      accent: fixHex(parsed.palette?.accent, '#e94560'),
      supporting: Array.isArray(parsed.palette?.supporting)
        ? parsed.palette.supporting.filter((c: any) => typeof c === 'string' && hex.test(c)).slice(0, 3)
        : [],
    },
    typography: {
      family: String(parsed.typography?.family || 'Inter'),
      character: String(parsed.typography?.character || 'geometric sans'),
    },
    mood: String(parsed.mood || ''),
    designLanguage: String(parsed.designLanguage || ''),
    motifs: Array.isArray(parsed.motifs) ? parsed.motifs.map(String).slice(0, 4) : [],
    visualSignatures: Array.isArray(parsed.visualSignatures) ? parsed.visualSignatures.map(String).slice(0, 4) : [],
    whitespace: (['breathing', 'dense', 'balanced'].includes(parsed.whitespace) ? parsed.whitespace : 'balanced') as BrandFingerprint['whitespace'],
    fontFamily: String(parsed.typography?.family || 'Inter'),
  };
}

// ─── Step 2: brand-specific design directions ──────────────────────────────
//
// Instead of hardcoded "Minimalist / Pattern / Editorial" modifiers (which
// produce generic output regardless of brand), we ask Claude opus to propose
// 3 dense, brand-specific style directions. Each one becomes the {styleVariant}
// for one gpt-image-1 call. Nike gets athletic-energetic directions; Aesop
// gets editorial-restrained directions.

const DIRECTIONS_PROMPT = `You are a senior art director. Given a brand fingerprint, propose 3
DRAMATICALLY DIFFERENT design directions for a bottle wrap label. Each direction must
genuinely tell a different visual story about THIS specific brand — not a generic
"minimal vs bold vs premium" split.

IMPORTANT — bottle geometry: the wrap covers a cylindrical bottle. The top ~15% AND
the bottom ~15% of the design disappear under the bottle's neck/cap and base curve.
When proposing directions, place text, logos, and key focal elements in the visible
BODY zone (the middle ~70% of the wrap), and treat the top and bottom 15% zones as
decorative background only.

Return ONLY a JSON object:

{
  "directions": [
    {
      "name": "2-3 word brand-specific name — evocative, not generic (e.g. 'Athletic Motion', 'Apothecary Manuscript', 'Heritage Block', 'Botanical Herbarium', 'Quiet Confidence', 'Neon Pulse')",
      "styleDescription": "3-5 dense, evocative sentences for an AI image generator. Describe the emotional FEEL, the composition principle, the dominant visual element (logo / typography / pattern / colour block / texture), and any SPECIFIC visual signatures from this brand's actual style. Be visual and concrete — colour placement, scale, weight, rhythm, focal point. Reference the brand's actual visual world. Position the focal text/logo in the visible body zone, NOT the top of the canvas."
    },
    { ... two more, each dramatically different ... }
  ]
}

The 3 directions must differ meaningfully on at least one of: dominant element, composition,
weight, decorative density. Avoid 3 variations of the same idea.`;

async function step2_directions(
  client: Anthropic,
  fingerprint: BrandFingerprint,
): Promise<DesignDirection[]> {
  const fpText = JSON.stringify(fingerprint, null, 2);
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      system: DIRECTIONS_PROMPT,
      messages: [{
        role: 'user',
        content: `Brand fingerprint:\n${fpText}\n\nPropose 3 brand-specific design directions for the bottle wrap.`,
      }],
    });
    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const parsed = parseJson(raw);
    if (!parsed?.directions || !Array.isArray(parsed.directions) || parsed.directions.length < 3) {
      throw new Error('Directions step did not return 3 directions');
    }
    return parsed.directions.slice(0, 3).map((d: any, i: number) => ({
      name: String(d.name || `Direction ${i + 1}`),
      styleDescription: String(d.styleDescription || ''),
    }));
  } catch (err: any) {
    console.error('[brand-directions] failed, falling back to generic styles', err?.message);
    // Generic fallback so we never crash; loses brand-specificity but pipeline continues.
    return [
      { name: 'Minimalist', styleDescription: 'Minimalist composition with bold centered typography. Generous whitespace. The brand name is the focal point in a confident, modern typeface.' },
      { name: 'Pattern', styleDescription: 'Pattern-rich repeating background using the brand colours. A subtle geometric or organic motif tiles across the wrap. Negative space in the centre for the brand mark.' },
      { name: 'Editorial', styleDescription: 'Editorial colour-blocked layout with strong contrast between the brand colours. Asymmetric composition with a clear focal area.' },
    ];
  }
}


// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { url, logoOverride } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) normalizedUrl = `https://${normalizedUrl}`;
    const baseUrl = new URL(normalizedUrl).origin;
    const domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');

    // ── Phase 0: fetch + extract ────────────────────────────────────────────
    let html = '';
    let fetchFailed = false;
    try {
      const res = await fetch(normalizedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BottleConfigurator/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) html = await res.text(); else fetchFailed = true;
    } catch { fetchFailed = true; }

    const title = extractMetaContent(html, 'og:title') || extractMetaContent(html, 'title') || '';
    const description = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description') || '';
    const themeColor = extractMetaContent(html, 'theme-color') || '';

    // Logo lookup (kept from v1)
    let logoDataUrl: string | null = logoOverride || null;
    if (!logoDataUrl && html) {
      const logoUrls = extractLogoUrls(html, baseUrl);
      let bestLogo: string | null = null;
      let bestSize = 0;
      for (const logoUrl of logoUrls) {
        const dataUrl = await fetchAsDataUrl(logoUrl);
        if (!dataUrl) continue;
        if (dataUrl.includes('x-icon')) continue;
        const size = dataUrl.length;
        if (size > bestSize) { bestSize = size; bestLogo = dataUrl; }
        if (size > 5000) break;
      }
      logoDataUrl = bestLogo;
    }

    // OG image for vision
    const ogImage = extractMetaContent(html, 'og:image');
    let ogImageBase64: string | null = null;
    let ogImageMimeType = 'image/png';
    if (ogImage) {
      const fullOgUrl = resolveUrl(ogImage, baseUrl);
      try {
        const imgRes = await fetch(fullOgUrl, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const ct = imgRes.headers.get('content-type') || 'image/png';
          if (ct.startsWith('image/')) {
            ogImageMimeType = ct.split(';')[0];
            const buf = await imgRes.arrayBuffer();
            ogImageBase64 = Buffer.from(buf).toString('base64');
          }
        }
      } catch {}
    }

    // Logo as base64 (for fingerprint vision step)
    let logoBase64: string | null = null;
    let logoMimeType = 'image/png';
    if (logoDataUrl) {
      const m = logoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        logoMimeType = m[1].startsWith('image/svg') ? 'image/png' : m[1]; // skip svg for vision
        logoBase64 = m[1].startsWith('image/svg') ? null : m[2];
      }
    }

    const client = new Anthropic({ apiKey });

    // ── Phase 1: Brand fingerprint ──────────────────────────────────────────
    const fingerprint = await step1_fingerprint(client, {
      domain,
      title,
      description,
      themeColor,
      ogImageBase64,
      ogImageMimeType,
      logoBase64,
      logoMimeType,
      fetchFailed,
    });

    // ── Phase 2: brand-specific design directions ──────────────────────────
    // Claude opus reads the fingerprint and proposes 3 directions that are
    // genuinely on-brand (Nike → athletic-energetic, Aesop → editorial-restraint).
    const directions = await step2_directions(client, fingerprint);

    // ── Phase 3: parallel OpenAI image generations using those directions ───
    const results = await Promise.all(
      directions.map((dir) => generateBrandImage(buildBrandImagePrompt(fingerprint, dir))),
    );

    // ── Phase 4: upload each generated PNG to ImageKit ─────────────────────
    const designs = await Promise.all(
      results.map(async (result, i) => {
        if (!("b64" in result)) return null;
        const name = `brand-${Date.now()}-${i}`;
        const hostedUrl = await uploadPngToImageKit(result.b64, name);
        const imageUrl = hostedUrl ?? `data:image/png;base64,${result.b64}`;
        return {
          name: directions[i].name,
          imageDataUrl: imageUrl,
          // SVG placeholder with LOGO_AREA so the frontend rasterizer can
          // composite the user's logo at a sensible spot on the PNG.
          svg: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><!-- LOGO_AREA cx="512" cy="512" size="220" --></svg>`,
        };
      }),
    );

    const validDesigns = designs.filter((d): d is NonNullable<typeof d> => d !== null);
    if (validDesigns.length === 0) {
      // Surface the actual OpenAI failure reason so it's diagnosable.
      const firstErr = results.find((r) => "error" in r) as { error: string } | undefined;
      return NextResponse.json(
        { error: `Image generation failed — ${firstErr?.error ?? "unknown reason"}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      brand: {
        companyName: fingerprint.companyName,
        tagline: fingerprint.tagline,
        industry: fingerprint.industry,
        primaryColor: fingerprint.palette.primary,
        secondaryColor: fingerprint.palette.secondary,
        accentColor: fingerprint.palette.accent,
        fontFamily: fingerprint.fontFamily,
        logoUrl: logoDataUrl,
        websiteUrl: normalizedUrl,
      },
      designs: validDesigns,
      logoDataUrl,
      fetchFailed,
      pipeline: {
        version: 4,
        engine: 'openai-gpt-image-1',
        fingerprint,
        directions,
      },
    });
  } catch (error: any) {
    console.error('Brand analysis error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze brand' }, { status: 500 });
  }
}
