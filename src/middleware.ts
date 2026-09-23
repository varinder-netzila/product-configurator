import { NextRequest, NextResponse } from "next/server";

const locales = ["nl", "en", "fr", "de", "cs", "es"];
const defaultLocale = "nl";

const publicPaths = [
  "/api/",
  "/assets/",
  "/_next/",
  "/favicon",
  "/Favicon",
];

const SESSION_COOKIE = "mc_session";

function getPreferredLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("locale")?.value;

  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

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

function isProtectedPath(path: string): boolean {
  return (
    path === "/configurator" ||
    path.startsWith("/configurator/")
  );
}

function hasValidSession(request: NextRequest): boolean {
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (!session) {
    return false;
  }

  try {
    const data = JSON.parse(session);

    return (
      typeof data.customerId === "string" &&
      data.customerId.length > 0 &&
      typeof data.shop === "string" &&
      data.shop.length > 0
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ------------------------------------------
  // PUBLIC PATHS
  // ------------------------------------------
  if (
    publicPaths.some((path) =>
      pathname.startsWith(path)
    )
  ) {
    return NextResponse.next();
  }

  // ------------------------------------------
  // LOCALE ALREADY PRESENT
  // ------------------------------------------
  const pathnameLocale = locales.find(
    (locale) =>
      pathname.startsWith(`/${locale}/`) ||
      pathname === `/${locale}`
  );

  if (pathnameLocale) {
    const pathWithoutLocale =
      pathname.slice(`/${pathnameLocale}`.length) || "/";

    // ------------------------------------------
    // PROTECT CONFIGURATOR
    // ------------------------------------------
    if (isProtectedPath(pathWithoutLocale)) {
      const sessionValid = hasValidSession(request);

      if (!sessionValid) {
        return NextResponse.redirect(
          "https://www.marvins.eu/apps/sso-pro"
        );
      }
    }

    // ------------------------------------------
    // SAVE LOCALE
    // ------------------------------------------
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
  // NO LOCALE → ADD LOCALE
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