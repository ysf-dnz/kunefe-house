import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import { resolveLocaleRedirect, type LocaleConfig } from "./lib/locale-routing";

// Edge-güvenli auth (Prisma yok) — yalnız JWT oturumunu doğrular
const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

// Dil ayarını edge'de Prisma'sız okumak için hafif uçtan cache'li getir
let cfgCache: { at: number; cfg: LocaleConfig } | null = null;
async function getLocaleConfig(origin: string): Promise<LocaleConfig | null> {
  const now = Date.now();
  if (cfgCache && now - cfgCache.at < 60_000) return cfgCache.cfg;
  try {
    const res = await fetch(`${origin}/api/locale-config`, { headers: { "x-mw": "1" } });
    if (!res.ok) return cfgCache?.cfg ?? null;
    const cfg = (await res.json()) as LocaleConfig;
    cfgCache = { at: now, cfg };
    return cfg;
  } catch {
    return cfgCache?.cfg ?? null; // fail-open
  }
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  // /kurye/* locale dışı, login'siz — next-intl'i atla
  if (pathname.startsWith("/kurye")) {
    return NextResponse.next();
  }
  const isAdmin =
    /^\/(tr|en|ar)?\/?admin(?!\/login)/.test(pathname) || /^\/admin(?!\/login)/.test(pathname);

  // Dil yönlendirmesi: yalnız herkese açık içerik (admin/kurye hariç).
  // Kapalı/uygunsuz dile gelen istek varsayılan dile 308 ile kalıcı yönlenir.
  if (!isAdmin && !pathname.startsWith("/admin")) {
    const cfg = await getLocaleConfig(req.nextUrl.origin);
    if (cfg) {
      const target = resolveLocaleRedirect(pathname, cfg);
      if (target) {
        const url = req.nextUrl.clone();
        url.pathname = target;
        return NextResponse.redirect(url, 308);
      }
    }
  }

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
