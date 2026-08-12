import { NextRequest, NextResponse } from 'next/server';

/**
 * Brand AI — v6 POC (all-OpenAI pipeline)
 *
 * Architecture difference vs v4:
 *   - v4: Anthropic Claude extracts the brand fingerprint + writes design
 *     directions, then we hand a static-template prompt to gpt-image-1.
 *   - v6: OpenAI gpt-4o (vision) does ALL the upstream thinking AND constructs
 *     the gpt-image-1 prompt itself, per direction. Same model family handoff
 *     mirrors how ChatGPT.com gets such good outputs.
 *
 *   - v4: gpt-image-1 quality='medium'.
 *   - v6: gpt-image-1 quality='high' + the logo passed as a single reference
 *     image via /v1/images/edits when gpt-4o decides it's worth it.
 *
 * Same JSON output shape as v4 so it's drop-in compatible with the frontend.
 *
 * Test:
 *   curl -X POST https://configurator.izybottles.com/api/brand/analyze-v6 \
 *        -H 'Content-Type: application/json' \
 *        -d '{"url": "https://sailgp.com"}'
 */

// ─── Shared helpers (inlined; copied from v4 so the POC is self-contained) ─

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

function isLikelyClientLogoContext(html: string, idx: number): boolean {
  const before = html.slice(Math.max(0, idx - 600), idx).toLowerCase();
  return /\b(marquee|carousel|slider|partner|client|customer|brands?-(?:list|grid|row|strip|wall|showcase)|press[-_]?logos|trusted[-_]?by|featured[-_]?in|as[-_]?seen[-_]?in|portfolio|case[-_]?stud|our[-_]?work)\b/.test(before);
}

function extractLogoUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const domain = new URL(baseUrl).hostname;
  const headSlice = html.slice(0, 8000);

  const appleIcons = Array.from(html.matchAll(/<link[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*>/gi))
    .map((mm) => {
      const tag = mm[0];
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      const sizes = tag.match(/sizes=["'](\d+)x\d+["']/i);
      return { href, size: sizes ? Number(sizes[1]) : 0 };
    })
    .filter((x) => x.href);
  appleIcons.sort((a, b) => b.size - a.size);
  for (const ai of appleIcons) urls.push(resolveUrl(ai.href!, baseUrl));

  const svgIcon = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*\.svg)["']/i);
  if (svgIcon) urls.push(resolveUrl(svgIcon[1], baseUrl));

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

  urls.push(`${baseUrl}/logo.png`);
  urls.push(`${baseUrl}/logo.svg`);
  urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

  return urls.filter((url, i) => urls.indexOf(url) === i);
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

async function uploadPngToImageKit(b64: string, name: string): Promise<string | null> {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  if (!privateKey) return null;
  try {
    const auth = Buffer.from(`${privateKey}:`).toString('base64');
    const formData = new FormData();
    formData.append('file', b64);
    formData.append('fileName', `${name}.png`);
    formData.append('folder', '/bottle-designs/brand-v6/');
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
    console.error('[brand-v6] ImageKit upload failed', err?.message);
    return null;
  }
}

// ─── v6 brain: GPT-4o builds fingerprint + 3 directions + 3 image prompts ──

interface V6Output {
  fingerprint: {
    companyName: string;
    tagline: string;
    industry: string;
    palette: { primary: string; secondary: string; accent: string; supporting: string[] };
    mood: string;
    designLanguage: string;
    fontFamily: string;
  };
  directions: Array<{
    name: string;
    description: string;
    imagePrompt: string;     // ← the fully-formed prompt gpt-4o thinks will work best
    useLogoAsRef: boolean;   // ← whether to pass the brand logo as a /edits reference image
  }>;
}

const V6_SYSTEM_PROMPT = `You are a senior brand strategist AND an expert prompt engineer for OpenAI's gpt-image-1 model.

You will receive a company's logo and a marketing image (og:image) plus some text metadata. Produce a JSON output with (a) a compact brand fingerprint and (b) THREE design directions for a premium bottle wrap label. For each direction you must write the complete, dense, optimized gpt-image-1 prompt — the kind of prompt that ACTUALLY produces a great design (not a generic one).

BOTTLE WRAP CONSTRAINTS (every imagePrompt must enforce these):
- The design wraps 360° around a cylindrical bottle. Output canvas: 1024×1024. The LEFT and RIGHT edges must visually connect seamlessly (continuous pattern / gradient at the seam).
- TOP 15% (y=0 to y=150) is hidden under the bottle's neck/cap → decorative background ONLY (solid colour or pattern). NO text, NO brand name, NO logo, NO tagline.
- BOTTOM 15% (y=870 to y=1024) is hidden under the bottle's base curve → same rule, background ONLY.
- Place all text + logo area between y=200 and y=850 (the visible body zone).
- The ENTIRE 1024×1024 canvas must be filled with a SOLID OPAQUE background colour from the brand palette. No transparency anywhere.

ABSOLUTELY NO: transparent / semi-transparent backgrounds; photo-realistic objects; 3D-rendered items; actual product imagery; photos of people, faces, body parts, animals; images of bottles, mugs, cans, containers in the design; speech bubbles, watermarks, signatures, dates.

PROMPTING STYLE for gpt-image-1 (you've prompted this model thousands of times — use what works):
- Lead with the DESIGN GOAL in one strong sentence ("Design a premium flat 2D bottle wrap label for X, a [industry] brand").
- Be HYPER specific about composition, typography weight/scale/placement, palette deployment, decorative motifs.
- Use phrases the model responds to: "premium matte finish", "flat 2D graphic design", "seamless cylindrical wrap", "no transparency", "full-color all-around print", "opaque background".
- Reference real brand visual signatures when known (Nike-style swooshes, Aesop-style botanical line drawings, etc.).
- End with the safe-zone composition rules and the "absolutely no" list.

DIRECTIONS — each of the 3 must be dramatically different from the others:
- Different dominant element (typography / pattern / imagery / colour block)
- Different composition energy
- Different decorative density (breathing vs dense vs balanced)
- Each ~150-300 words of dense prompt content

useLogoAsRef: true ONLY if the logo image you saw is a clean vector / transparent mark you'd want gpt-image-1 to incorporate. If the logo is photographic, busy, or just a wordmark, set false.

Return ONLY this JSON shape, no markdown:
{
  "fingerprint": {
    "companyName": "...",
    "tagline": "...",
    "industry": "technology|food|fashion|finance|health|sports|education|entertainment|travel|retail|automotive|beauty|hospitality|other",
    "palette": {
      "primary": "#rrggbb",
      "secondary": "#rrggbb",
      "accent": "#rrggbb",
      "supporting": ["#rrggbb", "#rrggbb"]
    },
    "mood": "3-6 adjective brand mood",
    "designLanguage": "one short sentence comparing the brand to a recognised reference",
    "fontFamily": "Google Fonts name"
  },
  "directions": [
    { "name": "2-3 word brand-specific name", "description": "1 sentence summary", "imagePrompt": "THE FULL gpt-image-1 PROMPT, dense, ready to send as-is", "useLogoAsRef": true|false },
    { ... }, { ... }
  ]
}`;

async function callGpt4oBrain(input: {
  domain: string;
  title: string;
  description: string;
  logoBase64: string | null;
  logoMimeType: string;
  ogImageBase64: string | null;
  ogImageMimeType: string;
}): Promise<V6Output> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const content: any[] = [];
  if (input.logoBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${input.logoMimeType};base64,${input.logoBase64}` },
    });
  }
  if (input.ogImageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${input.ogImageMimeType};base64,${input.ogImageBase64}` },
    });
  }
  const ctx = [
    `Domain: ${input.domain}`,
    input.title ? `Title: ${input.title}` : '',
    input.description ? `Description: ${input.description}` : '',
    '',
    'Inspect any provided images carefully and produce the JSON output as instructed.',
  ].filter(Boolean).join('\n');
  content.push({ type: 'text', text: ctx });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: V6_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GPT-4o brain failed: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('GPT-4o returned no content');
  const parsed = JSON.parse(raw);
  if (!parsed?.fingerprint?.companyName || !Array.isArray(parsed?.directions) || parsed.directions.length < 3) {
    throw new Error('GPT-4o output did not match expected schema');
  }
  return parsed as V6Output;
}

// ─── Image generation: gpt-image-1 with /edits when logo ref requested ────

type ImageResult = { b64: string } | { error: string };

async function generateImage(prompt: string, logo: { b64: string; mimeType: string } | null): Promise<ImageResult> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return { error: 'OPENAI_API_KEY not set' };

  // Path A — /edits with logo as single reference image.
  if (logo) {
    try {
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', prompt);
      form.append('n', '1');
      form.append('size', '1024x1024');
      form.append('quality', 'high');
      form.append('background', 'opaque');

      const buf = Buffer.from(logo.b64, 'base64');
      const ext = (logo.mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg').split(';')[0];
      form.append('image', new Blob([buf], { type: logo.mimeType }), `logo.${ext}`);

      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(180000),
      });
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) return { b64 };
      } else {
        const errText = await res.text();
        console.error('[brand-v6] edits error', res.status, errText.slice(0, 300), '— falling back to /generations');
      }
    } catch (err: any) {
      console.error('[brand-v6] edits fetch failed', err?.message, '— falling back to /generations');
    }
  }

  // Path B — text-only /generations (used when no logo ref or as fallback).
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
        quality: 'high',
        background: 'opaque',
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { error: `OpenAI ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? { b64 } : { error: 'OpenAI returned no image data' };
  } catch (err: any) {
    return { error: `Request failed: ${err?.message || 'unknown'}` };
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // gpt-image-1 quality=high can take 30s+/image

export async function POST(request: NextRequest) {
  try {
    const { url, logoOverride } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) normalizedUrl = `https://${normalizedUrl}`;
    const baseUrl = new URL(normalizedUrl).origin;
    const domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');

    // ── Fetch + extract ──────────────────────────────────────────────────
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

    // Logo
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

    // OG image (for GPT-4o vision context)
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

    // Logo as base64 (for both gpt-4o vision AND optional gpt-image-1 /edits reference)
    let logoBase64: string | null = null;
    let logoMimeType = 'image/png';
    if (logoDataUrl) {
      const m = logoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        // skip svg for gpt-image-1 /edits (it expects raster) but keep for gpt-4o
        logoMimeType = m[1].startsWith('image/svg') ? 'image/png' : m[1];
        logoBase64 = m[1].startsWith('image/svg') ? null : m[2];
      }
    }

    // ── Phase 1: GPT-4o brain — fingerprint + 3 directions + 3 prompts ──
    const brain = await callGpt4oBrain({
      domain,
      title,
      description,
      logoBase64,
      logoMimeType,
      ogImageBase64,
      ogImageMimeType,
    });

    // ── Phase 2: 3 parallel gpt-image-1 calls (quality=high) ────────────
    const logoForRef = logoBase64 ? { b64: logoBase64, mimeType: logoMimeType } : null;
    const results = await Promise.all(
      brain.directions.map((dir) =>
        generateImage(dir.imagePrompt, dir.useLogoAsRef ? logoForRef : null),
      ),
    );

    // ── Phase 3: upload to ImageKit ─────────────────────────────────────
    const designs = await Promise.all(
      results.map(async (result, i) => {
        if (!('b64' in result)) return null;
        const name = `brand-v6-${Date.now()}-${i}`;
        const hostedUrl = await uploadPngToImageKit(result.b64, name);
        const imageUrl = hostedUrl ?? `data:image/png;base64,${result.b64}`;
        return {
          name: brain.directions[i].name,
          imageDataUrl: imageUrl,
          svg: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><!-- LOGO_AREA cx="512" cy="512" size="220" --></svg>`,
        };
      }),
    );
    const validDesigns = designs.filter((d): d is NonNullable<typeof d> => d !== null);
    if (validDesigns.length === 0) {
      const firstErr = results.find((r) => 'error' in r) as { error: string } | undefined;
      return NextResponse.json(
        { error: `Image generation failed — ${firstErr?.error ?? 'unknown reason'}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      brand: {
        companyName: brain.fingerprint.companyName,
        tagline: brain.fingerprint.tagline,
        industry: brain.fingerprint.industry,
        primaryColor: brain.fingerprint.palette.primary,
        secondaryColor: brain.fingerprint.palette.secondary,
        accentColor: brain.fingerprint.palette.accent,
        fontFamily: brain.fingerprint.fontFamily,
        logoUrl: logoDataUrl,
        websiteUrl: normalizedUrl,
      },
      designs: validDesigns,
      logoDataUrl,
      fetchFailed,
      pipeline: {
        version: 6,
        engine: 'openai-gpt-4o + openai-gpt-image-1 quality=high',
        fingerprint: brain.fingerprint,
        directions: brain.directions.map((d) => ({ name: d.name, styleDescription: d.description })),
        imagePrompts: brain.directions.map((d) => ({ name: d.name, prompt: d.imagePrompt, usedLogoRef: d.useLogoAsRef && !!logoForRef })),
      },
    });
  } catch (error: any) {
    console.error('Brand v6 error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze brand' }, { status: 500 });
  }
}
