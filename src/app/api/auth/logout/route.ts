import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "All cookies deleted",
  });

  const allCookies = request.cookies.getAll();

  for (const cookie of allCookies) {
    response.cookies.set(cookie.name, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  // Explicit marker: user hit logout on purpose.
  // Middleware checks this to avoid silently re-authenticating
  // via the Shopify SSO check right after logout.
  response.cookies.set("mc_logged_out", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5, // 5 min grace window
  });
    return NextResponse.redirect(
      `https://www.marvins.eu/`
    );
}