import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "nl", "fr", "de", "cs", "es"];
const defaultLocale = "en";

// Paths that should NOT be locale-prefixed
const publicPaths = ["/api/", "/assets/", "/_next/", "/favicon", "/Favicon"];

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
    // Set locale cookie and continue
    const response = NextResponse.next();
    response.cookies.set("locale", pathnameLocale, { path: "/", maxAge: 31536000 });
    return response;
  }

  // No locale in path → redirect to preferred locale
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
