import { describe, it, expect } from "vitest";
import { localize, localizedStringSchema } from "@/lib/i18n-field";

describe("localize", () => {
  const field = { tr: "Künefe", en: "Kunefe", ar: "كنافة" };
  it("istenen dili döner", () => {
    expect(localize(field, "en")).toBe("Kunefe");
    expect(localize(field, "ar")).toBe("كنافة");
  });
  it("dil boşsa tr'ye fallback yapar", () => {
    expect(localize({ tr: "Künefe", en: "", ar: "" }, "en")).toBe("Künefe");
  });
  it("null alanda boş string döner", () => {
    expect(localize(null, "tr")).toBe("");
  });
});

describe("localizedStringSchema", () => {
  it("geçerli nesneyi kabul eder", () => {
    expect(() => localizedStringSchema.parse({ tr: "a", en: "b", ar: "c" })).not.toThrow();
  });
  it("tr zorunlu, eksikse hata verir", () => {
    expect(() => localizedStringSchema.parse({ tr: "", en: "b", ar: "c" })).toThrow();
  });
});
