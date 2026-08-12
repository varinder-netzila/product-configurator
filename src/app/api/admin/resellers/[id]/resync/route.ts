import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { setReseller } from '@/lib/resellersDb';
import { RESELLERS as STATIC_RESELLERS } from '@/data/resellers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/resellers/:id/resync
 *
 * Re-write the KV overlay for ONE reseller from whatever's currently in
 * src/data/resellers.ts. Surgical alternative to the all-or-nothing
 * /api/admin/seed-resellers route — leaves every other reseller's KV
 * overlay (and admin-only edits) untouched.
 *
 * Useful when a git-push updates a reseller's static config (e.g. a new
 * logo URL) but the live config keeps returning the old KV value.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = params.id.trim().toLowerCase();
  const staticEntry = STATIC_RESELLERS[key];
  if (!staticEntry) {
    return NextResponse.json({ error: `No static config for "${key}"` }, { status: 404 });
  }
  try {
    await setReseller(staticEntry);
    return NextResponse.json({ ok: true, reseller: staticEntry });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Resync failed' }, { status: 500 });
  }
}
