import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

// Edge-güvenli auth (Prisma yok) — yalnız JWT oturumunu doğrular
const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // /kurye/* locale dışı, login'siz — next-intl'i atla
  if (pathname.startsWith("/kurye")) {
    return NextResponse.next();
  }
  const isAdmin =
    /^\/(tr|en|ar)?\/?admin(?!\/login)/.test(pathname) || /^\/admin(?!\/login)/.test(pathname);
  const isLoggedIn = !!req.auth;
  if (isAdmin && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
