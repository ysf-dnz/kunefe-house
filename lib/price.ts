import type { Locale } from "./i18n-field";
import type { CurrencyCode } from "./currency";

const LOCALE_MAP: Record<Locale, string> = { tr: "tr-TR", en: "en-US", ar: "ar-SA" };
const CURRENCY_LOCALE: Record<CurrencyCode, string> = { TRY: "tr-TR", USD: "en-US", QAR: "ar-QA" };

/** Prisma Decimal | number | string -> number | null (güvenli) */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

/** 149.9, "USD" -> "$149.90" (para birimi koduna göre sembol). */
export function formatPrice(value: number | null, currency: CurrencyCode = "TRY", locale?: Locale): string | null {
  if (value === null) return null;
  const displayLocale = locale ? (LOCALE_MAP[locale] ?? "tr-TR") : CURRENCY_LOCALE[currency];
  return new Intl.NumberFormat(displayLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** İndirim yüzdesi (eski fiyata göre). 200 -> 150 = %25 */
export function discountPercent(price: number | null, oldPrice: number | null): number | null {
  if (price === null || oldPrice === null || oldPrice <= 0 || price >= oldPrice) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
