import jwt from 'jsonwebtoken';

// A separate secret from SHOPIFY_APP_SECRET — this one only needs to be known
// by marvinscloud.com itself (both sides of this token are the same app).
const SSO_SECRET = process.env.SSO_JWT_SECRET!;

export interface SsoTokenPayload {
  customerId: string;
  shop: string;
}

// Deliberately very short-lived: it only needs to survive the instant
// redirect from marvins.eu -> marvinscloud.com, not a real session.
export function createSsoToken(payload: SsoTokenPayload): string {
  return jwt.sign(payload, SSO_SECRET, { expiresIn: '60s' });
}

export function verifySsoToken(token: string): SsoTokenPayload | null {
  try {
    return jwt.verify(token, SSO_SECRET) as SsoTokenPayload;
  } catch {
    return null;
  }
}