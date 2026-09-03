// import { getTKN } from "@/lib/shopify";
// import { NextRequest, NextResponse } from "next/server";
// export async function GET(request: NextRequest) {
//   try {
//     const shop = request.nextUrl.searchParams.get("shop");

//     if (!shop) {
//       return NextResponse.json(
//         { error: "Shop parameter is required" },
//         { status: 400 }
//       );
//     }

//     const token = await getTKN(shop);

//     if (!token) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "No Shopify session/token found",
//         },
//         { status: 401 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       shop,
//       hasToken: token,
//       tokenPrefix: token.substring(0, 8),
//     });
//   } catch (error: any) {
//     console.error("Shopify token error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: error?.message || "Failed to get token",
//       },
//       { status: 500 }
//     );
//   }
// }