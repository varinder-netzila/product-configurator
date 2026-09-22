import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function verifyProxySignature(
  searchParams: URLSearchParams,
  secret: string
): boolean {
  const params = Object.fromEntries(searchParams.entries());
  const { signature, ...rest } = params;

  if (!signature) return false;

  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('');

  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');

  return calculatedSignature === signature;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return new NextResponse('Server misconfiguration', { status: 500 });
  }

  if (!verifyProxySignature(searchParams, secret)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const shop = searchParams.get('shop');
  const loggedInCustomerId = searchParams.get('logged_in_customer_id');

  return new NextResponse(
    `<div>Hello from your app proxy, shop: ${shop}</div>`,
    {
      status: 200,
      headers: { 'Content-Type': 'application/liquid' },
    }
  );
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return new NextResponse('Server misconfiguration', { status: 500 });
  }

  if (!verifyProxySignature(searchParams, secret)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // handle POST logic here

  return NextResponse.json({ success: true });
}