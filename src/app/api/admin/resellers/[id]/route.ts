import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { deleteReseller, getReseller, setReseller } from '@/lib/resellersDb';
import type { ResellerConfig } from '@/data/resellers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reseller = await getReseller(params.id);
  if (!reseller) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ reseller });
}

/** Update an existing reseller. The id in the URL must match the body.id. */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: ResellerConfig;
  try {
    body = (await request.json()) as ResellerConfig;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body?.id !== params.id) {
    return NextResponse.json({ error: 'URL id and body.id must match' }, { status: 400 });
  }

  try {
    await setReseller(body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteReseller(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 });
  }
}
