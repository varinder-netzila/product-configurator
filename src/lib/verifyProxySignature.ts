import crypto from 'crypto';

// This is the Client secret of your custom Shopify app (Configuration tab).
// Shopify signs every App Proxy request with it; we recompute the same
// signature and compare, so we can trust logged_in_customer_id wasn't forged.
const SHOPIFY_APP_SECRET = process.env.SHOPIFY_APP_SECRET!;

/**
 * Verifies a Shopify App Proxy request signature.
 * https://shopify.dev/docs/apps/build/online-store/display-dynamic-data/app-proxies#verify-app-proxy-requests
 */
export function verifyProxySignature(searchParams: URLSearchParams): boolean {
  const params = new URLSearchParams(searchParams);
  const signature = params.get('signature');
  if (!signature) return false;
  params.delete('signature');

  // Shopify requires params sorted alphabetically by key, joined with no separator
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('');

  const computed = crypto
    .createHmac('sha256', SHOPIFY_APP_SECRET)
    .update(sorted)
    .digest('hex');

  // Lengths must match before timingSafeEqual, or it throws
  if (computed.length !== signature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}