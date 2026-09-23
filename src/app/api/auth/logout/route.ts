import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'mc_session';

export async function GET() {
  const response = NextResponse.redirect(
    'https://www.marvins.eu/account/login?error=login_required-'
  );

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}