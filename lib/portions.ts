import type { Locale } from "./i18n-field";

export type Portion = { persons: number; price: number; oldPrice?: number };

/** Admin formundan gelen JSON stringi güvenle Portion[]'a çevirir, doğrular, sıralar. */
export function parsePortions(raw: string | null | undefined): Portion[] {
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const seen = new Set<number>();
  const out: Portion[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const persons = Number(r.persons);
    const price = Number(r.price);
    if (!Number.isFinite(persons) || persons <= 0) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    if (seen.has(persons)) continue;
    seen.add(persons);

    const portion: Portion = {
      persons: Math.round(persons),
      price: Math.round(price * 100) / 100,
    };
    const oldPrice = Number(r.oldPrice);
    if (Number.isFinite(oldPrice) && oldPrice > price) {
      portion.oldPrice = Math.round(oldPrice * 100) / 100;
    }
    out.push(portion);
  }
  return out.sort((a, b) => a.persons - b.persons);
}

const LABELS: Record<Locale, (n: number) => string> = {
  tr: (n) => `${n} kişilik`,
  en: (n) => `for ${n}`,
  ar: (n) => `لـ ${n} أشخاص`,
};

export function portionLabel(persons: number, locale: Locale): string {
  return (LABELS[locale] ?? LABELS.tr)(persons);
}

export function minPortionPrice(portions: Portion[]): number | null {
  if (portions.length === 0) return null;
  return Math.min(...portions.map((p) => p.price));
}
