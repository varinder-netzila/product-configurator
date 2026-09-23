import { NextRequest, NextResponse } from 'next/server';
import { verifyProxySignature } from '@/lib/verifyProxySignature';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'mc_session';
const SESSION_MAX_AGE = 60 * 15; // 15 minutes

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

  // ------------------------------------------
  // Verify Shopify App Proxy signature
  // ------------------------------------------
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

  const loggedInCustomerId =
    searchParams.get('logged_in_customer_id');

  const shop =
    searchParams.get('shop') || 'marvins.eu';

  const isAuthCheck =
    searchParams.get('check') === '1';

  const returnUrl = encodeURIComponent(
    '/apps/sso-pro'
  );

  // ------------------------------------------
  // CUSTOMER NOT LOGGED IN
  // ------------------------------------------
  if (!loggedInCustomerId) {
    return NextResponse.redirect(
      `https://www.marvins.eu/account/login?return_url=${returnUrl}`
    );
  }

  // ------------------------------------------
  // AUTH CHECK
  // ------------------------------------------
  if (isAuthCheck) {
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

  // ------------------------------------------
  // CREATE APP SESSION
  // ------------------------------------------
  const sessionData = JSON.stringify({
    customerId: loggedInCustomerId,
    shop,
  });

  console.log('🔥 Creating mc_session:', sessionData);

  const response = NextResponse.redirect(
    'https://marvinscloud.com/en/configurator'
  );

  response.cookies.set(SESSION_COOKIE, sessionData, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}