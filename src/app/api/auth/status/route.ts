// app/api/auth/status/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const loggedOut = request.cookies.get("mc_logged_out")?.value === "1";
  const hasSession = Boolean(request.cookies.get("mc_session")?.value);

  return NextResponse.json({
    isLoggedIn: hasSession && !loggedOut,
  });
}