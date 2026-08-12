import { isAuthed } from '@/lib/adminAuth';
import { getAllStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-Sent Events endpoint for the live stats dashboard. Pushes the full
 * snapshot every ~5 seconds. The full payload is small (one row per reseller
 * × ~10 events × 6 months) so re-sending is fine and avoids diffing logic.
 *
 * The browser's built-in EventSource handles reconnects automatically, so
 * we don't need ack/heartbeat plumbing.
 */
export async function GET() {
  if (!isAuthed()) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const push = async () => {
        if (closed) return;
        try {
          const data = await getAllStats(6);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Soft-fail: keep the connection alive even if one snapshot blows up.
          console.error('[stats:sse] snapshot failed', e);
        }
      };
      // Send an initial snapshot immediately, then on a 5s interval.
      await push();
      interval = setInterval(push, 5000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disables proxy buffering on some hosts (incl. Nginx); harmless elsewhere.
      'X-Accel-Buffering': 'no',
    },
  });
}
