import { NextRequest, NextResponse } from 'next/server';
import { getReseller } from '@/lib/resellersDb';

export const dynamic = 'force-dynamic';

/** Public read: the configurator calls this to overlay live edits on top of
 *  the static config it shipped with. Returns null when no reseller matches. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const reseller = await getReseller(params.id);
  return NextResponse.json({ reseller });
}
