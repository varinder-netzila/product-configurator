import { NextRequest, NextResponse } from "next/server";

const locales = ["nl", "en", "fr", "de", "cs", "es"];
const defaultLocale = "nl";

// Paths that should NOT be locale-prefixed
const publicPaths = [
  "/api/",
  "/assets/",
  "/_next/",
  "/favicon",
  "/Favicon",
];

const SESSION_COOKIE = "mc_session";

function getPreferredLocale(request: NextRequest): string {
  // 1. Check locale cookie
  const cookieLocale = request.cookies.get("locale")?.value;

  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Check browser language
  const acceptLang =
    request.headers.get("accept-language") || "";

  for (const lang of acceptLang.split(",")) {
    const code = lang
      .split(";")[0]
      .trim()
      .substring(0, 2)
      .toLowerCase();

    if (locales.includes(code)) {
      return code;
    }
  }

  return defaultLocale;
}

// Matches "/configurator" or "/configurator/..."
function isProtectedPath(pathWithoutLocale: string): boolean {
  return (
    pathWithoutLocale === "/configurator" ||
    pathWithoutLocale.startsWith("/configurator/")
  );
}

// Check whether the app session exists
async function handleConfiguratorAccess(
  request: NextRequest
): Promise<NextResponse | null> {
  const existingSession =
    request.cookies.get(SESSION_COOKIE)?.value;

  // No app session
  if (!existingSession) {
    // Send the user through Shopify App Proxy.
    //
    // Shopify will automatically add:
    // logged_in_customer_id
    // shop
    //
    // The SSO route will create mc_session and
    // redirect back to the configurator.
    return NextResponse.redirect(
      "https://www.marvins.eu/apps/sso-pro"
    );
  }

  // Session exists → allow request
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ------------------------------------------
  // Skip public paths
  // ------------------------------------------
  if (
    publicPaths.some((path) =>
      pathname.startsWith(path)
    )
  ) {
    return NextResponse.next();
  }

  // ------------------------------------------
  // Check whether URL already has a locale
  // ------------------------------------------
  const pathnameLocale = locales.find(
    (locale) =>
      pathname.startsWith(`/${locale}/`) ||
      pathname === `/${locale}`
  );

  // ------------------------------------------
  // URL HAS LOCALE
  // ------------------------------------------
  if (pathnameLocale) {
    const pathWithoutLocale =
      pathname.slice(pathnameLocale.length + 1) || "/";

    // Protect configurator
    if (isProtectedPath(pathWithoutLocale)) {
      const guardResponse =
        await handleConfiguratorAccess(request);

      if (guardResponse) {
        return guardResponse;
      }
    }

    // Store locale preference
    const response = NextResponse.next();

    response.cookies.set(
      "locale",
      pathnameLocale,
      {
        path: "/",
        maxAge: 31536000,
      }
    );

    return response;
  }

  // ------------------------------------------
  // NO LOCALE → ADD PREFERRED LOCALE
  // ------------------------------------------

  const locale = getPreferredLocale(request);

  const url = request.nextUrl.clone();

  url.pathname = `/${locale}${pathname}`;

  const response = NextResponse.redirect(url);

  response.cookies.set(
    "locale",
    locale,
    {
      path: "/",
      maxAge: 31536000,
    }
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon|Favicon|.*\\.).*)",
  ],
};