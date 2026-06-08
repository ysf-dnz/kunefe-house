import { describe, it, expect } from "vitest";
import { buildWhatsAppHref } from "@/lib/whatsapp";

describe("buildWhatsAppHref", () => {
  it("numara ve mesajdan wa.me linki üretir", () => {
    expect(buildWhatsAppHref("905555555555", "Merhaba")).toBe("https://wa.me/905555555555?text=Merhaba");
  });
  it("mesajı URL-encode eder", () => {
    expect(buildWhatsAppHref("905", "a b")).toContain("text=a%20b");
  });
});
