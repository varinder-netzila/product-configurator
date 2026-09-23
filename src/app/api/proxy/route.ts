import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';
import { createSsoToken } from '@/lib/ssoToken';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // --------------------------------------------------
  // 1. Verify Shopify App Proxy signature
  // --------------------------------------------------
  if (!verifyProxySignature(searchParams)) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Invalid Shopify App Proxy signature',
      },
      { status: 401 }
    );
  }

  const loggedInCustomerId =
    searchParams.get('logged_in_customer_id');

  const shop =
    searchParams.get('shop') || 'marvins.eu';

  const isAuthCheck =
    searchParams.get('check') === '1';

  // --------------------------------------------------
  // 2. BACKGROUND AUTH CHECK
  // --------------------------------------------------
  // Called by:
  // /apps/sso-pro?check=1
  //
  // No redirect and no JWT creation.
  // Shopify tells us whether a customer is logged in
  // through logged_in_customer_id.
  // --------------------------------------------------
  if (isAuthCheck) {
    if (!loggedInCustomerId) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      customerId: loggedInCustomerId,
      shop,
    });
  }

  // --------------------------------------------------
  // 3. NORMAL SSO FLOW
  // --------------------------------------------------
  if (!loggedInCustomerId) {
    const returnUrl = encodeURIComponent(
      '/apps/sso-pro'
    );

    return NextResponse.redirect(
      `https://www.marvins.eu/account/login?return_url=${returnUrl}`
    );
  }

  // --------------------------------------------------
  // 4. Create 30-second SSO JWT
  // --------------------------------------------------
  const token = await createSsoToken({
    customerId: loggedInCustomerId,
    shop,
  });

  console.error('🔥 TOKEN TYPE:', typeof token);
  console.error(
    '🔥 TOKEN PARTS:',
    token.split('.').length
  );

  // --------------------------------------------------
  // 5. Redirect to configurator
  // --------------------------------------------------
  return NextResponse.redirect(
    `https://marvinscloud.com/en/configurator?token=${encodeURIComponent(
      token
    )}`
  );
}