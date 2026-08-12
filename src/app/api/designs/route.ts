import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

async function uploadToImageKit(content: string, fileName: string): Promise<void> {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  const auth = Buffer.from(`${privateKey}:`).toString('base64');

  const formData = new FormData();
  formData.append('file', Buffer.from(content).toString('base64'));
  formData.append('fileName', fileName);
  formData.append('folder', '/bottle-designs/shared/');
  formData.append('useUniqueFileName', 'false');

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ImageKit upload failed (${res.status}): ${err}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { config, reseller } = await request.json();

    if (!config || !config.selectedBottleType) {
      return NextResponse.json({ error: 'Design config is required' }, { status: 400 });
    }

    const id = crypto.randomBytes(8).toString('hex');
    const configJson = JSON.stringify(config);

    try {
      await uploadToImageKit(configJson, `design-${id}.json`);
    } catch (uploadError: any) {
      console.error('Upload failed:', uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const baseUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3000';
    // Carry the reseller through so the viewer renders in their branding.
    const resellerQuery = reseller ? `?reseller=${encodeURIComponent(String(reseller))}` : '';
    const viewerUrl = `${baseUrl}/viewer/${id}${resellerQuery}`;
    const embedCode = `<iframe src="${viewerUrl}" width="600" height="600" frameborder="0" style="border:none;border-radius:12px;" allow="xr-spatial-tracking"></iframe>`;

    return NextResponse.json({
      success: true,
      id,
      viewerUrl,
      embedCode,
      screenshotUrl: config.screenshotUrl || null,
    });
  } catch (error: any) {
    console.error('Design share error:', error);
    return NextResponse.json({ error: error.message || 'Failed to share design' }, { status: 500 });
  }
}
