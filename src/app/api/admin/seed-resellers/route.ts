import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { seedFromStatic } from '@/lib/resellersDb';

export const dynamic = 'force-dynamic';

/** Idempotent: copies every reseller from src/data/resellers.ts into KV so the
 *  admin UI starts with a complete editable list. Re-running just overwrites
 *  the KV copies with the static values again. */
export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await seedFromStatic();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}
