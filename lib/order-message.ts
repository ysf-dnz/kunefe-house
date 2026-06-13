import type { Locale } from "./i18n-field";
import { portionLabel } from "./portions";

export type OrderMessageInput = {
  productName: string;
  persons: number;
  priceText: string | null;
  customerName: string;
  customerPhone: string;
  addressNote: string;
  note?: string | null;
  locationUrl?: string | null;
  locale: Locale;
};

type Labels = {
  header: string;
  product: string;
  portion: string;
  priceConfirm: string;
  location: string;
  address: string;
  note: string;
  footer: string;
};

const L: Record<Locale, Labels> = {
  tr: {
    header: "🍮 Kunefe House — Sipariş",
    product: "Ürün",
    portion: "Porsiyon",
    priceConfirm: "Fiyat: WhatsApp'tan teyit edilecek",
    location: "Konum",
    address: "Adres",
    note: "Not",
    footer: "Siparişi onaylıyorum.",
  },
  en: {
    header: "🍮 Kunefe House — Order",
    product: "Product",
    portion: "Portion",
    priceConfirm: "Price: to be confirmed on WhatsApp",
    location: "Location",
    address: "Address",
    note: "Note",
    footer: "I confirm the order.",
  },
  ar: {
    header: "🍮 Kunefe House — طلب",
    product: "المنتج",
    portion: "الحصة",
    priceConfirm: "السعر: سيتم تأكيده عبر واتساب",
    location: "الموقع",
    address: "العنوان",
    note: "ملاحظة",
    footer: "أؤكد الطلب.",
  },
};

export function buildOrderMessage(i: OrderMessageInput): string {
  const t = L[i.locale] ?? L.tr;
  const lines: string[] = [];
  lines.push(t.header, "");
  lines.push(`${t.product}: ${i.productName}`);

  const portionText = portionLabel(i.persons, i.locale);
  if (i.priceText) {
    lines.push(`${t.portion}: ${portionText} · ${i.priceText}`);
  } else {
    lines.push(`${t.portion}: ${portionText}`);
    lines.push(t.priceConfirm);
  }
  lines.push("");
  lines.push(`👤 ${i.customerName}`);
  lines.push(`📞 ${i.customerPhone}`);
  if (i.locationUrl) lines.push(`📍 ${t.location}: ${i.locationUrl}`);
  lines.push(`🏠 ${t.address}: ${i.addressNote}`);
  if (i.note && i.note.trim()) lines.push(`📝 ${t.note}: ${i.note.trim()}`);
  lines.push("", t.footer);
  return lines.join("\n");
}
