import type { Locale } from "@/lib/i18n-field";

/**
 * Malzemeler çok dilli saklanır: { tr: string[], en: string[], ar: string[] }.
 * Eski kayıtlar düz string[] (yalnız TR) olabilir — geriye dönük uyumlu okunur.
 */

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Verilen dile göre malzeme listesi; o dil boşsa TR'ye düşer. */
export function ingredientsForLocale(value: unknown, locale: Locale): string[] {
  if (Array.isArray(value)) return asStringArray(value); // eski şema (TR)
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const loc = asStringArray(o[locale]);
    return loc.length ? loc : asStringArray(o.tr);
  }
  return [];
}

/** Form defaultValue için: her dil satır-satır birleştirilmiş metin. */
export function ingredientsToText(value: unknown): { tr: string; en: string; ar: string } {
  const join = (v: unknown) => asStringArray(v).join("\n");
  if (Array.isArray(value)) return { tr: join(value), en: "", ar: "" };
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return { tr: join(o.tr), en: join(o.en), ar: join(o.ar) };
  }
  return { tr: "", en: "", ar: "" };
}
