export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import shopify from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
    }

    // Validate shop domain
    const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
    if (!sanitizedShop) {
      return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
    }

    // Generate a nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');

    const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;
    const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders';

    const authUrl = `https://${sanitizedShop}/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_API_KEY}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${nonce}`;
    //  `&grant_options[]=per-user`;

    // Store nonce in a cookie for validation in the callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('shopify_auth_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
