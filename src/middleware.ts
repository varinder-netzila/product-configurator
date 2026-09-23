import { NextRequest, NextResponse } from "next/server";
import { verifySsoToken } from "@/lib/ssoToken";

const locales = ["nl", "en", "fr", "de", "cs", "es"];
const defaultLocale = "nl";

const publicPaths = ["/api/", "/assets/", "/_next/", "/favicon", "/Favicon"];

const SESSION_COOKIE = "mc_session";
const LOGGED_OUT_COOKIE = "mc_logged_out";
const SESSION_MAX_AGE = 60 * 15;

function getPreferredLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale;

  const acceptLang = request.headers.get("accept-language") || "";
  for (const lang of acceptLang.split(",")) {
    const code = lang.split(";")[0].trim().substring(0, 2).toLowerCase();
    if (locales.includes(code)) return code;
  }

  return defaultLocale;
}

function isProtectedPath(pathWithoutLocale: string): boolean {
  return pathWithoutLocale === "/configurator" || pathWithoutLocale.startsWith("/configurator/");
}

async function handleConfiguratorAccess(
  request: NextRequest
): Promise<NextResponse | null> {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const loggedOut = request.cookies.get(LOGGED_OUT_COOKIE)?.value === "1";

  if (token) {
    const payload = await verifySsoToken(token);

    if (payload) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete("token");

      const res = NextResponse.redirect(cleanUrl);
      if (cleanUrl.pathname.includes("configurator")) {
        res.cookies.set(
          SESSION_COOKIE,
          JSON.stringify({ customerId: payload.customerId }),
          {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_MAX_AGE,
          }
        );
        // A real, freshly verified token means the user (re)authenticated
        // on purpose — clear the logged-out flag so normal auto-SSO resumes.
        res.cookies.set(LOGGED_OUT_COOKIE, "", { path: "/", maxAge: 0 });
      }
      return res;
    }
    // Invalid/expired token — fall through.
  }

  // User explicitly logged out and hasn't presented a fresh token yet.
  // Don't auto-bounce through Shopify SSO — send them to a neutral page.
  if (loggedOut && !token) {
    return NextResponse.redirect(
      `https://www.marvins.eu/apps/sso-pro?check=1`
    );
  }

  if (!token && !existingSession) {
    return NextResponse.redirect(
      `https://www.marvins.eu/apps/sso-pro?check=1`
    );
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const pathnameLocale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );

  if (pathnameLocale) {
    const pathWithoutLocale = pathname.slice(`/${pathnameLocale}`.length) || "/";

    if (isProtectedPath(pathWithoutLocale)) {
      const guardResponse = await handleConfiguratorAccess(request);
      if (guardResponse) return guardResponse;
    }

    const response = NextResponse.next();
    response.cookies.set("locale", pathnameLocale, { path: "/", maxAge: 31536000 });
    return response;
  }

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set("locale", locale, { path: "/", maxAge: 31536000 });
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon|Favicon|.*\\.).*)",
  ],
};