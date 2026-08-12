import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, makeSessionToken, ADMIN_COOKIE } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: '' }));

  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = makeSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'Admin password not configured on the server' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
