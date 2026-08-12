import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { getResellerOwners } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  try {
    const result = await getResellerOwners({ forceRefresh });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
