import { describe, it, expect } from "vitest";
import { buildEtaMessage } from "@/lib/eta-message";

describe("buildEtaMessage", () => {
  it("konumlu mesaj soru + maps linki içerir", () => {
    const msg = buildEtaMessage({ locationUrl: "https://maps.google.com/?q=41.01,28.97", locale: "tr" });
    expect(msg).toContain("kaç dakika");
    expect(msg).toContain("https://maps.google.com/?q=41.01,28.97");
  });
  it("adres notu doluysa eklenir", () => {
    const msg = buildEtaMessage({ locationUrl: "https://x", addressNote: "A apt kat 3", locale: "tr" });
    expect(msg).toContain("A apt kat 3");
  });
  it("konum yoksa düz soru mesajı döner", () => {
    const msg = buildEtaMessage({ locationUrl: null, locale: "tr" });
    expect(msg).not.toContain("📍");
    expect(msg.toLowerCase()).toContain("teslimat süresi");
  });
  it("İngilizce locale İngilizce mesaj döner", () => {
    const msg = buildEtaMessage({ locationUrl: "https://x", locale: "en" });
    expect(msg.toLowerCase()).toContain("how many minutes");
  });
});
