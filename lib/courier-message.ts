export type CourierMessageInput = {
  productTitle: string;
  persons?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  addressNote?: string | null;
  locationUrl?: string | null;
};

/** Kuryeye gönderilen teslimat mesajı (yalnız Türkçe — kurye yerel personel). */
export function buildCourierMessage(i: CourierMessageInput): string {
  const lines: string[] = [];
  lines.push("🛵 Kunefe House — Teslimat", "");
  const portion = i.persons ? ` · ${i.persons} kişilik` : "";
  lines.push(`Sipariş: ${i.productTitle}${portion}`);
  if (i.customerName) lines.push(`👤 Müşteri: ${i.customerName}`);
  if (i.customerPhone) lines.push(`📞 Telefon: ${i.customerPhone}`);
  if (i.addressNote) lines.push(`🏠 Adres: ${i.addressNote}`);
  if (i.locationUrl) lines.push(`📍 Konum: ${i.locationUrl}`);
  lines.push("", "Lütfen siparişi teslim alıp yola çıktığında bilgi ver.");
  return lines.join("\n");
}
