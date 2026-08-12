import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { listResellers, setReseller } from '@/lib/resellersDb';
import type { ResellerConfig } from '@/data/resellers';

export const dynamic = 'force-dynamic';

/** List every reseller (static + KV merged), for the admin UI table. */
export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resellers = await listResellers();
  return NextResponse.json({ resellers });
}

/** Create a new reseller (or upsert if id already exists). */
export async function POST(request: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: ResellerConfig;
  try {
    body = (await request.json()) as ResellerConfig;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.id?.trim() || !body?.companyName?.trim()) {
    return NextResponse.json({ error: 'id and companyName are required' }, { status: 400 });
  }

  try {
    await setReseller(body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 });
  }
}
