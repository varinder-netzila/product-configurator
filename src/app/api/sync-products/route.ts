// src/app/api/shopify-test/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getShopifyClientGraphql } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const shop = request.nextUrl.searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const client = await getShopifyClientGraphql(shop);

    const response = await client.query({
      data: {
        query: `
          {
            shop {
              name
              myshopifyDomain
            }
          }
        `,
      },
    });

    return NextResponse.json({
      success: true,
      shop,
      response: response.body,
    });
  } catch (error: any) {
    console.error("Shopify test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Shopify request failed",
      },
      { status: 500 }
    );
  }
}