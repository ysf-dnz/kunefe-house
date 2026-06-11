import type { Locale } from "./i18n-field";

const LOCALE_MAP: Record<Locale, string> = { tr: "tr-TR", en: "en-US", ar: "ar-SA" };

/** Prisma Decimal | number | string -> number | null (güvenli) */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

/** 149.9 -> "149,90 ₺" (locale'e göre) */
export function formatPrice(value: number | null, locale: Locale = "tr"): string | null {
  if (value === null) return null;
  return new Intl.NumberFormat(LOCALE_MAP[locale] ?? "tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** İndirim yüzdesi (eski fiyata göre). 200 -> 150 = %25 */
export function discountPercent(price: number | null, oldPrice: number | null): number | null {
  if (price === null || oldPrice === null || oldPrice <= 0 || price >= oldPrice) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
