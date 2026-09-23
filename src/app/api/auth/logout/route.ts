import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'mc_session';

export async function GET() {
const response = NextResponse.json({
  success: true,
  message: "mc_session deleted",
});

response.cookies.delete(SESSION_COOKIE);

return response;
}