export type LocaleConfig = { enabled: string[]; defaultLocale: string };

const PREFIXED = ["tr", "en", "ar"] as const;

/** URL'den dili ve dilsiz kalan yolu ayırır. TR normalde öneksizdir ama
 *  açık "/tr" öneki de tanınır (aksi halde /tr → /en/tr gibi 404 olur). */
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
  const hadTrPrefix = pathname === "/tr" || pathname.startsWith("/tr/");
  // Açık "/tr" öneki: TR varsayılansa öneksize indir (/tr/x → /x); değilse aşağıda
  // served kontrolüne düşüp varsayılana yönlenir.
  if (hadTrPrefix && cfg.defaultLocale === "tr") {
    return rest === pathname ? null : rest;
  }
  if (isServed(locale, cfg)) return null;
  const prefix = cfg.defaultLocale === "tr" ? "" : `/${cfg.defaultLocale}`;
  const restPath = rest === "/" ? "" : rest;
  const target = `${prefix}${restPath}` || "/";
  return target === pathname ? null : target;
}
