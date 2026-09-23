import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'SESSION_COOKIE';

export async function GET() {
  const response = NextResponse.redirect(
    'https://www.marvins.eu/'
  );

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}