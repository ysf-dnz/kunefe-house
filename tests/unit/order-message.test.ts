import { describe, it, expect } from "vitest";
import { buildOrderMessage } from "@/lib/order-message";

const base = {
  productName: "Fıstıklı Künefe",
  persons: 4,
  priceText: "320 ₺",
  customerName: "Ahmet Yılmaz",
  customerPhone: "05551112233",
  addressNote: "X mah. Y sok. A apt. kat 3 D5",
  note: "Az şerbetli",
  locationUrl: "https://maps.google.com/?q=41.01,28.97",
  locale: "tr" as const,
};

describe("buildOrderMessage", () => {
  it("tüm alanlarla tam mesaj üretir", () => {
    const msg = buildOrderMessage(base);
    expect(msg).toContain("Kunefe House");
    expect(msg).toContain("Fıstıklı Künefe");
    expect(msg).toContain("4 kişilik");
    expect(msg).toContain("320 ₺");
    expect(msg).toContain("Ahmet Yılmaz");
    expect(msg).toContain("05551112233");
    expect(msg).toContain("https://maps.google.com/?q=41.01,28.97");
    expect(msg).toContain("X mah. Y sok. A apt. kat 3 D5");
    expect(msg).toContain("Az şerbetli");
  });

  it("priceText null ise teyit satırı yazar, tutar yazmaz", () => {
    const msg = buildOrderMessage({ ...base, priceText: null });
    expect(msg).toContain("WhatsApp");
    expect(msg).not.toContain("320 ₺");
  });

  it("locationUrl yoksa konum satırı atlanır", () => {
    const msg = buildOrderMessage({ ...base, locationUrl: null });
    expect(msg).not.toContain("📍");
  });

  it("note boşsa not satırı atlanır", () => {
    const msg = buildOrderMessage({ ...base, note: "" });
    expect(msg).not.toContain("📝");
  });

  it("İngilizce locale İngilizce etiket kullanır", () => {
    const msg = buildOrderMessage({ ...base, locale: "en" });
    expect(msg).toContain("for 4");
    expect(msg).toContain("Order");
  });
});
