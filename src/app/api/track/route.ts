import { NextRequest, NextResponse } from 'next/server';
import { track } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/** Public event tracker. Fire-and-forget from the configurator. */
export async function POST(request: NextRequest) {
  try {
    const { reseller, event } = await request.json();
    if (typeof event !== 'string' || !event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 });
    }
    // Vercel injects the visitor country (ISO alpha-2) as a header on the
    // edge layer. Falls back to undefined off-Vercel — track() then skips geo.
    const country = request.headers.get('x-vercel-ip-country') ?? undefined;
    await track(reseller, event, country);
  } catch (e) {
    console.error('[track] error', e);
  }
  // Always 200 — tracking should never block the client.
  return NextResponse.json({ ok: true });
}
