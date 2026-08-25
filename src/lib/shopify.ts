import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-10';
import { storeSession, loadSession, deleteSession } from './sessionStorage';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: (process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders').split(','),
  hostName: (process.env.SHOPIFY_APP_URL || 'http://localhost:3000').replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
  restResources,
});

export default shopify;

export { storeSession, loadSession, deleteSession };

/**
 * Get an authenticated REST client for a given shop.
 * Loads the offline session from storage and creates a client.
 */

export async function getTKN(shop: string) {
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await loadSession(sessionId);
    return session?.accessToken;
}  
export async function getShopifyClient(shop: string) {
  const sessionId = shopify.session.getOfflineId(shop);
  const session = await loadSession(sessionId);
 // console.log("=== session ===: ", session)

  if (!session?.accessToken) {
    throw new Error(`No active session found for shop: ${shop}. Please re-authenticate.`);
  }

  return new shopify.clients.Rest({ session });
}

export async function getShopifyClientGraphql(shop: string) {
  const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!accessToken) {
    throw new Error(
      "SHOPIFY_ADMIN_API_TOKEN is not configured."
    );
  }

  const shopDomain = shop
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const session = new Session({
    id: `env-${shopDomain}`,
    shop: shopDomain,
    state: "active",
    isOnline: false,
    accessToken,
  });

  return new shopify.clients.Graphql({ session });
}

/**
 * Get an authenticated GraphQL client for a given shop.
 */
export async function getShopifyGraphqlClient(shop: string) {
  const sessionId = shopify.session.getOfflineId(shop);
  const session = await loadSession(sessionId);

  if (!session?.accessToken) {
    throw new Error(`No active session found for shop: ${shop}. Please re-authenticate.`);
  }

  return new shopify.clients.Graphql({ session });
}
