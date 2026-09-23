import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'mc_session';

export async function GET() {
  const response = NextResponse.json({
    success: true,
    message: "mc_session deleted",
  });

  response.cookies.delete({
    name: SESSION_COOKIE,
    path: "/",       // must match the path used when the cookie was set
    // domain: "marvinscloud.com", // only if you explicitly set a domain originally
  });

  return response;
}