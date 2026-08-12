import { NextRequest, NextResponse } from 'next/server';

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
  } catch {
    return null;
  }
}

/**
 * Refine an existing brand design with a free-text instruction.
 * Uses OpenAI gpt-image-1's image-edit endpoint: it takes the current design
 * as the source image + the instruction, and returns a modified version that
 * keeps the overall composition but applies the requested change.
 */
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, instruction } = await request.json();
    if (!imageUrl || !instruction?.trim()) {
      return NextResponse.json({ error: 'imageUrl and instruction are required' }, { status: 400 });
    }

    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not set on the server' }, { status: 500 });
    }

    // Fetch the current design image (ImageKit URL or data URL) as a Blob.
    let sourceBlob: Blob;
    if (imageUrl.startsWith('data:')) {
      const b64 = imageUrl.replace(/^data:[^;]+;base64,/, '');
      sourceBlob = new Blob([Buffer.from(b64, 'base64')], { type: 'image/png' });
    } else {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
      if (!imgRes.ok) {
        return NextResponse.json({ error: 'Could not load the source design image' }, { status: 502 });
      }
      sourceBlob = await imgRes.blob();
    }

    // Build the edit prompt. Keep the brand-wrap constraints so the refinement
    // stays a usable bottle wrap (opaque, safe zones, no garments/photos).
    const prompt = `Refine this bottle wrap label design with the following change: ${instruction.trim()}

Keep it a flat 2D print-ready bottle wrap. The ENTIRE canvas stays filled with a SOLID, OPAQUE background (no transparency). Keep the top 15% and bottom 15% as background only (they're hidden under the bottle's cap and base) — keep text/logo in the central body. Maintain a seamless left/right edge for the 360° wrap. No photo-realistic objects, no people, no actual bottle imagery.`;

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', sourceBlob, 'design.png');
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    form.append('quality', 'medium');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[brand-refine] OpenAI error', res.status, errText.slice(0, 300));
      return NextResponse.json({ error: `OpenAI ${res.status}: ${errText.slice(0, 160)}` }, { status: 500 });
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: 'OpenAI returned no image' }, { status: 502 });
    }

    const hostedUrl = await uploadPngToImageKit(b64, `brand-refine-${Date.now()}`);
    return NextResponse.json({ imageDataUrl: hostedUrl ?? `data:image/png;base64,${b64}` });
  } catch (err: any) {
    console.error('[brand-refine] error', err?.message);
    return NextResponse.json({ error: err?.message || 'Refine failed' }, { status: 500 });
  }
}
