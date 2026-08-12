/**
 * Fire-and-forget client-side tracker. Posts to /api/track in the background;
 * the call is intentionally async and never awaited, so failures or slow
 * networks can't block the configurator UI.
 *
 * Usage:
 *   trackEvent("tool:texture", wl.reseller?.id);
 */
export function trackEvent(event: string, reseller?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    // sendBeacon would be ideal for unload events, but for in-app interactions
    // a plain fetch is fine and gives us a meaningful response if we ever want it.
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reseller: reseller ?? null, event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never block on tracking */
  }
}
