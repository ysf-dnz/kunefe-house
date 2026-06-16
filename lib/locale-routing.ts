export type LocaleConfig = { enabled: string[]; defaultLocale: string };

const PREFIXED = ["en", "ar"] as const;

/** URL'den dili ve dilsiz kalan yolu ayırır. TR'nin öneki yoktur. */
export function splitLocale(pathname: string): { locale: string; rest: string } {
  for (const l of PREFIXED) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) {
      const rest = pathname.slice(l.length + 1) || "/";
      return { locale: l, rest };
    }
  }
  return { locale: "tr", rest: pathname || "/" };
}

/** Bir dilin yayında sunulup sunulmadığı. Varsayılan dil her zaman sunulur;
 *  TR yalnız varsayılan TR ise sunulur (öneksiz kök varsayılana aittir). */
function isServed(locale: string, cfg: LocaleConfig): boolean {
  if (locale === cfg.defaultLocale) return true;
  if (locale === "tr") return false; // TR varsayılan değilse öneksiz kök varsayılana gider
  return cfg.enabled.includes(locale);
}

/**
 * Verilen yol kapalı/uygun olmayan bir dile aitse, aynı içeriğin varsayılan
 * dildeki adresini döndürür (kalıcı yönlendirme için). Uygunsa null.
 */
export function resolveLocaleRedirect(pathname: string, cfg: LocaleConfig): string | null {
  const { locale, rest } = splitLocale(pathname);
  if (isServed(locale, cfg)) return null;
  const prefix = cfg.defaultLocale === "tr" ? "" : `/${cfg.defaultLocale}`;
  const restPath = rest === "/" ? "" : rest;
  const target = `${prefix}${restPath}` || "/";
  return target === pathname ? null : target;
}
