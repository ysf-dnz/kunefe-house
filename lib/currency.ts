import type { Locale } from "./i18n-field";
import type { Portion } from "./portions";

export type CurrencyCode = "TRY" | "USD" | "QAR";

export function currencyForLocale(locale: Locale): CurrencyCode {
  return locale === "en" ? "USD" : locale === "ar" ? "QAR" : "TRY";
}

type ProductPrices = {
  price?: number | null; oldPrice?: number | null;
  priceUsd?: number | null; oldPriceUsd?: number | null;
  priceQar?: number | null; oldPriceQar?: number | null;
};

export function productPriceForLocale(p: ProductPrices, locale: Locale): { price: number | null; oldPrice: number | null } {
  const c = currencyForLocale(locale);
  if (c === "USD") return { price: p.priceUsd ?? null, oldPrice: p.oldPriceUsd ?? null };
  if (c === "QAR") return { price: p.priceQar ?? null, oldPrice: p.oldPriceQar ?? null };
  return { price: p.price ?? null, oldPrice: p.oldPrice ?? null };
}

export function portionPriceForLocale(portion: Portion, locale: Locale): { price: number | null; oldPrice: number | null } {
  const c = currencyForLocale(locale);
  if (c === "USD") return { price: portion.usd ?? null, oldPrice: portion.oldUsd ?? null };
  if (c === "QAR") return { price: portion.qar ?? null, oldPrice: portion.oldQar ?? null };
  return { price: portion.price ?? null, oldPrice: portion.oldPrice ?? null };
}

export function minPortionPriceForLocale(portions: Portion[], locale: Locale): number | null {
  const vals = portions.map((p) => portionPriceForLocale(p, locale).price).filter((v): v is number => v != null);
  return vals.length ? Math.min(...vals) : null;
}
