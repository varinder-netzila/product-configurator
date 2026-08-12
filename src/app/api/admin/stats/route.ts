import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getAllStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await getAllStats(6);
  return NextResponse.json(data);
}
