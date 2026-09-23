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
      maxAge: 0, // expires immediately
    });
  }

  return response;
}