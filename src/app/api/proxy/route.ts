import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const signature = url.searchParams.get("signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 401 }
    );
  }

  // Copy all query parameters except signature
  const params = new URLSearchParams(url.searchParams);
  params.delete("signature");

  // Shopify requires parameters sorted alphabetically
  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("");

  const secret = process.env.SHOPIFY_API_SECRET!;

  const calculatedSignature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  const valid =
    calculatedSignature.length === signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("logged_in_customer_id");

  return NextResponse.json({
    success: true,
    shop,
    customerId,
  });
}
