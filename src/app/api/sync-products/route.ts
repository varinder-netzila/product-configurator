import shopify from "@/lib/shopify";
import { loadSession } from "@/lib/sessionStorage";

export async function GET() {
  const shop = "marvins-houtbewerkerij.myshopify.com";

  try {
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await loadSession(sessionId);

    console.log("Shop:", shop);
    console.log("Session ID:", sessionId);
    console.log("Session found:", !!session);
    console.log("Has access token:", !!session?.accessToken);

    return Response.json({
      success: true,
      shop,
      sessionFound: !!session,
      hasAccessToken: !!session?.accessToken,
    });
  } catch (error: any) {
    console.error("Shopify test error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}