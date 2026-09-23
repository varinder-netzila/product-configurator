import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';
import { createSsoToken } from '@/lib/ssoToken';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Verify Shopify App Proxy signature
  if (!verifyProxySignature(searchParams)) {
    return NextResponse.redirect(
      'https://www.marvins.eu/apps/sso-pro'
    );
  }

  const loggedInCustomerId =
    searchParams.get('logged_in_customer_id');

  const shop =
    searchParams.get('shop') || 'marvins.eu';

  // Customer is not logged in
  if (!loggedInCustomerId) {
    const returnUrl = encodeURIComponent(
      '/apps/sso-pro'
    );

    return NextResponse.redirect(
      `https://www.marvins.eu/account/login?return_url=${returnUrl}`
    );
  }

  // IMPORTANT: createSsoToken() is async
  const token = await createSsoToken({
    customerId: loggedInCustomerId,
    shop,
  });

  console.error('🔥 TOKEN TYPE:', typeof token);
  console.error(
    '🔥 TOKEN PARTS:',
    token.split('.').length
  );

  return NextResponse.redirect(
    `https://marvinscloud.com/en/configurator?token=${encodeURIComponent(token)}`
  );
}