import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const leads = await getLeads();
  return NextResponse.json({ leads });
}
