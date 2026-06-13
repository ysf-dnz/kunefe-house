import { describe, it, expect } from "vitest";
import { buildCourierMessage } from "@/lib/courier-message";

const base = {
  productTitle: "Fıstıklı Künefe",
  persons: 4,
  customerName: "Ahmet Yılmaz",
  customerPhone: "05551112233",
  addressNote: "X mah. Y sok. A apt. kat 3 D5",
  locationUrl: "https://maps.google.com/?q=41.01,28.97",
};

describe("buildCourierMessage", () => {
  it("tüm alanlarla tam teslimat mesajı üretir", () => {
    const msg = buildCourierMessage(base);
    expect(msg).toContain("Kunefe House");
    expect(msg).toContain("Teslimat");
    expect(msg).toContain("Fıstıklı Künefe");
    expect(msg).toContain("4 kişilik");
    expect(msg).toContain("Ahmet Yılmaz");
    expect(msg).toContain("05551112233");
    expect(msg).toContain("X mah. Y sok. A apt. kat 3 D5");
    expect(msg).toContain("https://maps.google.com/?q=41.01,28.97");
  });

  it("persons null ise porsiyon kısmı eklenmez", () => {
    const msg = buildCourierMessage({ ...base, persons: null });
    expect(msg).toContain("Fıstıklı Künefe");
    expect(msg).not.toContain("kişilik");
  });

  it("locationUrl yoksa 📍 satırı atlanır", () => {
    const msg = buildCourierMessage({ ...base, locationUrl: null });
    expect(msg).not.toContain("📍");
  });

  it("customerPhone yoksa 📞 satırı atlanır", () => {
    const msg = buildCourierMessage({ ...base, customerPhone: null });
    expect(msg).not.toContain("📞");
  });
});
