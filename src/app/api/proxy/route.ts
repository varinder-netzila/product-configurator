import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';
import { createSsoToken } from '@/lib/ssoToken';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://marvinscloud.com',
  'Access-Control-Allow-Credentials': 'true',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const loggedInCustomerId =
    searchParams.get('logged_in_customer_id');

  const shop =
    searchParams.get('shop') || 'marvins.eu';

  const isAuthCheck =
    searchParams.get('check') === '1';
    
  // Verify Shopify App Proxy signature
  if (!verifyProxySignature(searchParams)) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Invalid Shopify App Proxy signature',
      },
      {
        status: 401,
        headers: CORS_HEADERS,
      }
    );
  }


  // ==========================================
  // BACKGROUND SHOPIFY LOGIN CHECK
  // ==========================================
  if (isAuthCheck) {
    if (!loggedInCustomerId) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
          headers: CORS_HEADERS,
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        customerId: loggedInCustomerId,
        shop,
      },
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  }

  // ==========================================
  // NORMAL SSO FLOW
  // ==========================================

  // Customer is not logged in
  if (!loggedInCustomerId) {
    const returnUrl = encodeURIComponent(
      '/apps/sso-pro'
    );

    return NextResponse.redirect(
      `https://www.marvins.eu/account/login?return_url=${returnUrl}`
    );
  }

  // Create 30-second SSO JWT
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
    `https://marvinscloud.com/en/configurator?token=${encodeURIComponent(
      token
    )}`
  );
}