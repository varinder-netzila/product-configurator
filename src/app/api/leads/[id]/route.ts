import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { patchLead, type LeadStatus } from '@/lib/leads';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: LeadStatus[] = ['pending', 'quoted', 'won', 'lost'];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { status?: LeadStatus; internalNotes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const lead = await patchLead(params.id, body);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  return NextResponse.json({ lead });
}
