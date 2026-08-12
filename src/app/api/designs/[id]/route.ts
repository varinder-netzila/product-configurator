import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
    }

    // Fetch from ImageKit URL endpoint
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    if (!urlEndpoint) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const configUrl = `${urlEndpoint}/bottle-designs/shared/design-${id}.json`;
    const res = await fetch(configUrl, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    const config = await res.json();
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Design fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch design' }, { status: 500 });
  }
}
