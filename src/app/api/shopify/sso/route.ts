import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';
import { createSsoToken } from '@/lib/ssoToken';

// Shopify App Proxy config: Subpath prefix "apps", Subpath "sso",
// Proxy URL "https://marvinscloud.com/api/shopify/sso".
// A click on https://marvins.eu/apps/sso/configurator arrives here,
// with logged_in_customer_id + signature added automatically by Shopify
// when the visitor is logged into the storefront.
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
    // Send them to Shopify's new customer login with return_to pointing
    // back at this same App Proxy path, so after a successful login
    // Shopify sends them right back here and the SSO handoff resumes.
    const returnTo = encodeURIComponent('/apps/sso/configurator');
    return NextResponse.redirect(
      `https://marvins.eu/customer_authentication/login?return_to=${returnTo}`
    );
  }

  const token = createSsoToken({ customerId: loggedInCustomerId, shop });

  return NextResponse.redirect(
    `https://marvinscloud.com/en/configurator?token=${encodeURIComponent(token)}`
  );
}