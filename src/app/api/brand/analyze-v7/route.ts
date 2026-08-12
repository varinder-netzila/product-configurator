import { NextRequest, NextResponse } from 'next/server';

/**
 * Brand AI — v7 POC (prompt-mode)
 *
 * Different philosophy from v4/v5/v6: no website extraction, no
 * auto-fingerprinting. The caller writes a free-text prompt — like they would
 * in ChatGPT.com — and we wrap it in the bottle-specific safe-zone constraints,
 * then send N parallel calls to gpt-image-1 quality=high.
 *
 * This matches how the user actually gets great results in ChatGPT today: a
 * dense, specific prompt they wrote themselves, not a website URL.
 *
 * Body:
 *   {
 *     prompt: string,         // the user's design prompt
 *     n?: number,             // how many variations (1-3, default 3)
 *     useLogoAsRef?: boolean, // pass logoDataUrl as a /edits reference image
 *     logoDataUrl?: string,   // optional logo as data: URL
 *   }
 */

const WRAP_CONSTRAINTS = `

OUTPUT FORMAT — CRITICAL, READ CAREFULLY:
- The output is a FLAT 2D ARTWORK. Like a printable poster, sticker, or flat label artwork. Not a render of a bottle, not a 3D mockup, not a cylindrical product photo.
- DO NOT apply any cylindrical perspective, curvature distortion, edge fade, vignette, or wrap-effect to the artwork. The artwork must read as a perfectly flat 2D rectangle when viewed.
- DO NOT render the design as if it is already printed on a bottle. The artwork will be wrapped onto a bottle AFTER generation by separate software — your job is only to produce the flat unwrapped artwork.
- Imagine the user is going to print this onto a flat sheet of paper and stick it on later.

CANVAS LAYOUT:
- Canvas size: 1024×1024 px, flat rectangular.
- LEFT and RIGHT edges must visually match so that when wrapped later the seam is invisible (continuous pattern/gradient at the seam — no abrupt cut).
- TOP 15% (pixels y=0 to y=150): decorative background ONLY (this strip will sit under the bottle's neck/cap after wrapping). NO text, NO logo, NO tagline, NO important elements here.
- BOTTOM 15% (pixels y=870 to y=1024): same rule, decorative background ONLY (will sit under the bottle's base curve).
- All text, logos, photography, focal elements: placed in the VISIBLE BODY ZONE between y=200 and y=850.
- ENTIRE canvas filled with an OPAQUE background colour. No transparency.

DO NOT INCLUDE:
- Cylindrical / curved / 3D rendering of the artwork itself.
- Any image of a bottle, mug, can, or other physical container in the artwork.
- Transparent or semi-transparent background.
- Watermarks, signatures, image-generator artifacts, date stamps.`;

type ImageResult = { b64: string } | { error: string };

async function generateImage(
  fullPrompt: string,
  logoRef: { b64: string; mimeType: string } | null,
): Promise<ImageResult> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return { error: 'OPENAI_API_KEY not set' };

  // Path A — /edits when a logo reference was supplied.
  if (logoRef) {
    try {
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', fullPrompt);
      form.append('n', '1');
      form.append('size', '1024x1024');
      form.append('quality', 'high');
      form.append('background', 'opaque');
      // ← THE missing param. Default is 'low' which lets the model take
      // creative liberties with the reference image (= it redraws the logo,
      // gets text wrong, shifts colours). 'high' instructs gpt-image-1 to
      // preserve the input image's elements faithfully. This is what
      // ChatGPT.com uses internally.
      form.append('input_fidelity', 'high');

      const buf = Buffer.from(logoRef.b64, 'base64');
      const ext = (logoRef.mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg').split(';')[0];
      form.append('image', new Blob([buf], { type: logoRef.mimeType }), `logo.${ext}`);

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
        console.error('[brand-v7] edits error', res.status, errText.slice(0, 300), '— falling back');
      }
    } catch (err: any) {
      console.error('[brand-v7] edits fetch failed', err?.message);
    }
  }

  // Path B — text-only /generations.
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: fullPrompt,
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

async function uploadPngToImageKit(b64: string, name: string): Promise<string | null> {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  if (!privateKey) return null;
  try {
    const auth = Buffer.from(`${privateKey}:`).toString('base64');
    const formData = new FormData();
    formData.append('file', b64);
    formData.append('fileName', `${name}.png`);
    formData.append('folder', '/bottle-designs/brand-v7/');
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
    console.error('[brand-v7] ImageKit upload failed', err?.message);
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt: string = (body.prompt || '').trim();
    const n: number = Math.max(1, Math.min(3, Number(body.n) || 3));
    const useLogoAsRef: boolean = !!body.useLogoAsRef;
    const logoDataUrl: string | null = body.logoDataUrl || null;

    if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    }

    let logoRef: { b64: string; mimeType: string } | null = null;
    if (useLogoAsRef && logoDataUrl) {
      const m = logoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (m && !m[1].startsWith('image/svg')) {
        logoRef = { b64: m[2], mimeType: m[1] };
      }
    }

    const fullPrompt = prompt + WRAP_CONSTRAINTS;

    const results = await Promise.all(
      Array.from({ length: n }, () => generateImage(fullPrompt, logoRef)),
    );

    const designs = await Promise.all(
      results.map(async (result, i) => {
        if (!('b64' in result)) return null;
        const name = `brand-v7-${Date.now()}-${i}`;
        const hostedUrl = await uploadPngToImageKit(result.b64, name);
        const imageUrl = hostedUrl ?? `data:image/png;base64,${result.b64}`;
        return {
          name: `Variation ${i + 1}`,
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
      designs: validDesigns,
      pipeline: {
        version: 7,
        engine: 'openai-gpt-image-1 quality=high — prompt-mode',
        fullPrompt,
        usedLogoRef: !!logoRef,
      },
    });
  } catch (error: any) {
    console.error('Brand v7 error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
