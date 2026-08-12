import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

async function uploadToImageKit(content: string, fileName: string): Promise<void> {
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  const auth = Buffer.from(`${privateKey}:`).toString('base64');
  const formData = new FormData();
  formData.append('file', Buffer.from(content).toString('base64'));
  formData.append('fileName', fileName);
  formData.append('folder', '/bottle-designs/shared/');
  formData.append('useUniqueFileName', 'false');
  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`ImageKit upload failed (${res.status})`);
}

export interface FeedbackComment {
  id: string;
  text: string;
  author: string;
  pinX: number;
  pinY: number;
  createdAt: string;
}

export interface DesignFeedback {
  designId: string;
  status: 'pending' | 'approved' | 'changes_requested';
  clientName: string;
  clientEmail: string;
  overallComment: string;
  comments: FeedbackComment[];
  createdAt: string;
  updatedAt: string;
}

async function fetchFeedbackFromImageKit(designId: string): Promise<DesignFeedback | null> {
  if (!urlEndpoint) return null;
  try {
    const url = `${urlEndpoint}/bottle-designs/shared/feedback-${designId}.json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function saveFeedbackToImageKit(designId: string, feedback: DesignFeedback): Promise<void> {
  await uploadToImageKit(JSON.stringify(feedback, null, 2), `feedback-${designId}.json`);
}

// GET — fetch feedback for a design
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const designId = url.searchParams.get('designId');
    if (!designId) return NextResponse.json({ error: 'designId required' }, { status: 400 });

    const feedback = await fetchFeedbackFromImageKit(designId);
    return NextResponse.json({ feedback });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — submit or update feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designId, status, clientName, clientEmail, overallComment, comments } = body;

    if (!designId || !status || !clientName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Load existing or create new
    const existing = await fetchFeedbackFromImageKit(designId);
    let feedback: DesignFeedback;

    if (existing) {
      feedback = {
        ...existing,
        status,
        overallComment: overallComment || existing.overallComment,
        comments: comments || existing.comments,
        updatedAt: now,
      };
    } else {
      feedback = {
        designId,
        status,
        clientName,
        clientEmail: clientEmail || '',
        overallComment: overallComment || '',
        comments: comments || [],
        createdAt: now,
        updatedAt: now,
      };
    }

    await saveFeedbackToImageKit(designId, feedback);

    // Send email notification
    const salesEmail = process.env.B2B_SALES_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (salesEmail && process.env.RESEND_API_KEY) {
      const statusLabel = status === 'approved' ? 'APPROVED' : 'CHANGES REQUESTED';
      const statusColor = status === 'approved' ? '#16a34a' : '#dc2626';

      const commentsList = (comments || [])
        .map((c: FeedbackComment) => `<li style="margin-bottom:8px;"><strong>${c.text}</strong></li>`)
        .join('');

      try {
        await resend.emails.send({
          from: `Bottle Configurator <${fromEmail}>`,
          to: [salesEmail],
          replyTo: clientEmail || undefined,
          subject: `Design ${statusLabel} by ${clientName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="padding: 16px 20px; background: ${statusColor}; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Design ${statusLabel}</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                  <tr><td style="padding: 6px 0; color: #666; width: 100px;">Client</td><td style="font-weight: bold;">${clientName}</td></tr>
                  ${clientEmail ? `<tr><td style="padding: 6px 0; color: #666;">Email</td><td><a href="mailto:${clientEmail}">${clientEmail}</a></td></tr>` : ''}
                </table>
                ${overallComment ? `<div style="margin-bottom: 16px;"><strong>Overall feedback:</strong><p style="margin: 4px 0; color: #333;">${overallComment}</p></div>` : ''}
                ${commentsList ? `<div><strong>Pinned comments (${(comments || []).length}):</strong><ul style="margin: 8px 0; padding-left: 20px;">${commentsList}</ul></div>` : ''}
                <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 12px;">View the design: <a href="${process.env.SHOPIFY_APP_URL || 'http://localhost:3000'}/viewer/${designId}">Open 3D Viewer</a></p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send feedback email:', emailError);
      }
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
