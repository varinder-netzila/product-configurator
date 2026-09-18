import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';
import { createSsoToken } from '@/lib/ssoToken';

// Catch-all: matches /api/shopify/sso AND /api/shopify/sso/anything.
// Shopify's App Proxy forwards https://marvins.eu/apps/sso/<anything>
// to https://marvinscloud.com/api/shopify/sso/<anything> - this route
// accepts any trailing path so the exact link used in the theme
// (with or without a suffix) doesn't matter.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

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
    // App Proxy path, so after a successful login the SSO handoff resumes.
    const returnUrl = encodeURIComponent('/apps/sso');
    // return NextResponse.redirect(
    //   `https://marvins.eu/account/login?return_url=${returnUrl}`
    // );
  }
 console.log(loggedInCustomerId);
  const token = createSsoToken({ customerId: loggedInCustomerId, shop });

  return NextResponse.redirect(
    `https://marvinscloud.com/en/configurator?token=${encodeURIComponent(token)}`
  );
}