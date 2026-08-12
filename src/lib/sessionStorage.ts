import { Session } from '@shopify/shopify-api';

/**
 * Session storage that works both locally (JSON file) and on Vercel (env-based).
 *
 * On Vercel (serverless), we use the SHOPIFY_ACCESS_TOKEN env var directly
 * since the token is permanent for custom apps.
 * On localhost, we use a JSON file for persistence across restarts.
 */

const isVercel = process.env.VERCEL === '1';

// In-memory cache for the current process
const sessionCache: Record<string, any> = {};

function readSessions(): Record<string, any> {
  if (isVercel) {
    return sessionCache;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const SESSION_FILE = path.join(process.cwd(), '.sessions.json');
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Corrupted file, start fresh
  }
  return {};
}

function writeSessions(sessions: Record<string, any>): void {
  if (isVercel) {
    Object.assign(sessionCache, sessions);
    return;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const SESSION_FILE = path.join(process.cwd(), '.sessions.json');
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write sessions:', e);
  }
}

export async function storeSession(session: Session): Promise<boolean> {
  const sessions = readSessions();
  sessions[session.id] = session.toObject();
  writeSessions(sessions);
  return true;
}

export async function loadSession(id: string): Promise<Session | undefined> {
  const sessions = readSessions();
  const data = sessions[id];
  if (data) {
    return new Session(data);
  }

  // Fallback: if we have a SHOPIFY_ACCESS_TOKEN env var, construct a session
  if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_SHOP_DOMAIN) {
    const shop = process.env.SHOPIFY_SHOP_DOMAIN;
    const expectedId = `offline_${shop}`;
    if (id === expectedId) {
      return new Session({
        id: expectedId,
        shop,
        state: 'active',
        isOnline: false,
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
        scope: process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders',
      });
    }
  }

  return undefined;
}

export async function deleteSession(id: string): Promise<boolean> {
  const sessions = readSessions();
  delete sessions[id];
  writeSessions(sessions);
  return true;
}

/**
 * Find an offline session for a given shop domain.
 * Offline session IDs follow the pattern: offline_{shop}
 */
export async function findSessionByShop(shop: string): Promise<Session | undefined> {
  const offlineId = `offline_${shop}`;
  return loadSession(offlineId);
}
