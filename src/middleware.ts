import { NextRequest, NextResponse } from "next/server";
import { verifySsoToken } from "@/lib/ssoToken";

const locales = ["nl", "en", "fr", "de", "cs", "es"];
const defaultLocale = "nl";

// Paths that should NOT be locale-prefixed
const publicPaths = ["/api/", "/assets/", "/_next/", "/favicon", "/Favicon"];

const SESSION_COOKIE = "mc_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day - tune to taste

function getPreferredLocale(request: NextRequest): string {
  // 1. Check cookie
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale;

  // 2. Check Accept-Language header
  const acceptLang = request.headers.get("accept-language") || "";
  for (const lang of acceptLang.split(",")) {
    const code = lang.split(";")[0].trim().substring(0, 2).toLowerCase();
    if (locales.includes(code)) return code;
  }

  return defaultLocale;
}

// Matches "/configurator" or "/configurator/..." (locale prefix already stripped)
function isProtectedPath(pathWithoutLocale: string): boolean {
  return pathWithoutLocale === "/configurator" || pathWithoutLocale.startsWith("/configurator/");
}

// Handles the SSO handoff + session check for the configurator route.
// Returns a NextResponse if it wants to redirect (block, or consume the
// token and set a session cookie), or null to mean "let the request through
// as normal" so the caller can continue with locale-cookie logic etc.
function handleConfiguratorAccess(request: NextRequest): NextResponse | null {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    const payload = verifySsoToken(token);
    if (payload) {
      // Valid SSO handoff - set our own session cookie, redirect to the
      // same URL with ?token= stripped so it never lingers in the address
      // bar / history.
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete("token");

      const res = NextResponse.redirect(cleanUrl);
      res.cookies.set(SESSION_COOKIE, JSON.stringify({ customerId: payload.customerId }), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
      return res;
    }
    // Invalid/expired token - fall through to the session check below
  }

  if (!existingSession) {
    // No valid SSO token and no existing session - send to Shopify's
    // classic customer login, with return_url pointing back through our
    // App Proxy so the SSO handoff runs again immediately after login.
    const returnUrl = encodeURIComponent("/apps/sso-pro");
    return NextResponse.redirect(
      `https://marvins.eu/account/login?return_url=${returnUrl}`
    );
  }

  return null; // Session already valid - let the request continue normally
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameLocale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );

  if (pathnameLocale) {
    const pathWithoutLocale = pathname.slice(`/${pathnameLocale}`.length) || "/";

    // Guard the configurator route before anything else
    if (isProtectedPath(pathWithoutLocale)) {
      const guardResponse = handleConfiguratorAccess(request);
      if (guardResponse) return guardResponse;
    }

    // Set locale cookie and continue
    const response = NextResponse.next();
    response.cookies.set("locale", pathnameLocale, { path: "/", maxAge: 31536000 });
    return response;
  }

  // No locale in path → redirect to preferred locale
  // (search params, including a possible ?token=, are preserved by clone())
  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set("locale", locale, { path: "/", maxAge: 31536000 });
  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    "/((?!api|_next/static|_next/image|assets|favicon|Favicon|.*\\.).*)",
  ],
};