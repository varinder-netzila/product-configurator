export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Session } from '@shopify/shopify-api';
import shopify, { storeSession } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shop = process.env.SHOPIFY_STORE_DOMAIN;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const hmac = url.searchParams.get('hmac');

    if (!shop || !code || !state) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate the nonce against the cookie
    const storedNonce = request.cookies.get('shopify_auth_nonce')?.value;
    if (!storedNonce || storedNonce !== state) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 403 });
    }

    // Validate the HMAC
    if (hmac) {
      const params = new URLSearchParams(url.search);
      params.delete('hmac');
      // Sort parameters alphabetically
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      const computedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
        .update(sortedParams)
        .digest('hex');

      if (computedHmac !== hmac) {
        return NextResponse.json({ error: 'HMAC validation failed' }, { status: 403 });
      }
    }

    // Exchange the authorization code for an access token

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, scope } = tokenData;

    // Create and store an offline session
    const sessionId = shopify.session.getOfflineId(shop);
    const session = new Session({
      id: sessionId,
      shop,
      state: state,
      isOnline: false,
      accessToken: access_token,
      scope: scope,
    });

    await storeSession(session);

    // Clear the nonce cookie and redirect to the configurator
    const response = NextResponse.redirect(
      `${process.env.SHOPIFY_APP_URL}/configurator?shop=${encodeURIComponent(shop)}&authenticated=true`
    );
    response.cookies.delete('shopify_auth_nonce');

    // Set a session cookie so the frontend knows which shop is authenticated
    response.cookies.set('shopify_shop', shop, {
      httpOnly: false, // Readable by frontend
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json({ error: 'Authentication callback failed' }, { status: 500 });
  }
}
