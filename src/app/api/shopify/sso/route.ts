import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';
import { createSsoToken } from '@/lib/ssoToken';

// This route only exists at exactly /api/shopify/sso (no sub-paths).
// The theme link and App Proxy must point to https://marvins.eu/apps/sso
// with no trailing segment, since a flat route.ts doesn't match anything
// beyond its own exact path.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
   console.log(Object.fromEntries(searchParams));

  return new NextResponse('Hello', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!verifyProxySignature(searchParams)) {
    // Request didn't genuinely come from Shopify - reject it
    return NextResponse.redirect('https://marvins.eu/');
  }

  const loggedInCustomerId = searchParams.get('logged_in_customer_id');
  const shop = searchParams.get('shop') || 'marvins.eu';

  if (!loggedInCustomerId) {
    // Signature is valid, but nobody is logged in on the storefront.
    // Classic accounts: /account/login honors return_url as long as the
    // theme's login form includes a hidden `return_to` field populated
    // from it (see main-login.liquid). This sends them back to this same
    // App Proxy path (no suffix, matching this route), so after a
    // successful login the SSO handoff resumes.
    const returnUrl = encodeURIComponent('/apps/sso');
    return NextResponse.redirect(
      `https://marvins.eu/account/login?return_url=${returnUrl}`
    );
  }

  const token = createSsoToken({ customerId: loggedInCustomerId, shop });

  return NextResponse.redirect(
    `https://marvinscloud.com/en/configurator?token=${encodeURIComponent(token)}`
  );
}