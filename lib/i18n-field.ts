import { z } from "zod";

export type Locale = "tr" | "en" | "ar";

export type LocalizedString = { tr: string; en: string; ar: string };

export const localizedStringSchema = z.object({
  tr: z.string().min(1, "Türkçe alan zorunludur"),
  en: z.string(),
  ar: z.string(),
});

export function localize(
  field: Partial<LocalizedString> | null | undefined,
  locale: Locale
): string {
  if (!field) return "";
  const value = field[locale];
  if (value && value.trim().length > 0) return value;
  return field.tr ?? "";
}
