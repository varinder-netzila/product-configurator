import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const params = Object.fromEntries(searchParams);
  console.log("SSO route:", req.url);
  return new NextResponse(
    `Hello from proxy. Params: ${JSON.stringify(params)}`,
    {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }
  );
}