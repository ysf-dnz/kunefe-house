import type { Locale } from "./i18n-field";

export type EtaMessageInput = {
  locationUrl?: string | null;
  addressNote?: string | null;
  locale: Locale;
};

type Labels = { withLoc: string; addr: string; without: string };

const L: Record<Locale, Labels> = {
  tr: {
    withLoc: "Merhaba 🛵 Bu adrese kaç dakikada teslim edebilirsiniz?",
    addr: "🏠",
    without: "Merhaba, teslimat süresi hakkında bilgi alabilir miyim?",
  },
  en: {
    withLoc: "Hello 🛵 How many minutes to deliver to this address?",
    addr: "🏠",
    without: "Hello, may I get information about your delivery time?",
  },
  ar: {
    withLoc: "مرحباً 🛵 كم دقيقة يستغرق التوصيل إلى هذا العنوان؟",
    addr: "🏠",
    without: "مرحباً، هل يمكنني الحصول على معلومات عن مدة التوصيل؟",
  },
};

export function buildEtaMessage(i: EtaMessageInput): string {
  const t = L[i.locale] ?? L.tr;
  if (i.locationUrl) {
    const lines = [t.withLoc, `📍 ${i.locationUrl}`];
    if (i.addressNote && i.addressNote.trim()) lines.push(`${t.addr} ${i.addressNote.trim()}`);
    return lines.join("\n");
  }
  return t.without;
}
