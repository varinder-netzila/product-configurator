import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'admin_session';

function adminPassword(): string | null {
  const p = (process.env.ADMIN_PASSWORD || '').trim();
  return p || null;
}

/** Stateless session token: HMAC of a fixed message keyed by the admin
 *  password. Only someone who knows ADMIN_PASSWORD (server-only) can produce
 *  it, so it can't be forged from the client. */
function expectedToken(): string | null {
  const pw = adminPassword();
  if (!pw) return null;
  return crypto.createHmac('sha256', pw).update('izy-admin-v1').digest('hex');
}

export function checkPassword(input: string): boolean {
  const pw = adminPassword();
  if (!pw) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function makeSessionToken(): string | null {
  return expectedToken();
}

/** True when the request carries a valid admin session cookie. */
export function isAuthed(): boolean {
  const expected = expectedToken();
  if (!expected) return false;
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
