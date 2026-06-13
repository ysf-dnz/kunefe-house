import { describe, it, expect } from "vitest";
import { parsePortions, portionLabel, minPortionPrice } from "@/lib/portions";

describe("parsePortions", () => {
  it("geçerli JSON'u kişi sayısına göre artan sıralar", () => {
    const raw = JSON.stringify([
      { persons: 6, price: 450 },
      { persons: 2, price: 180, oldPrice: 220 },
    ]);
    expect(parsePortions(raw)).toEqual([
      { persons: 2, price: 180, oldPrice: 220 },
      { persons: 6, price: 450 },
    ]);
  });
  it("geçersiz/eksik satırları eler", () => {
    const raw = JSON.stringify([
      { persons: 0, price: 100 },
      { persons: 4, price: -5 },
      { persons: 4, price: 320 },
      { persons: 2 },
    ]);
    expect(parsePortions(raw)).toEqual([{ persons: 4, price: 320 }]);
  });
  it("aynı kişi sayısından yalnız ilkini tutar", () => {
    const raw = JSON.stringify([
      { persons: 4, price: 320 },
      { persons: 4, price: 999 },
    ]);
    expect(parsePortions(raw)).toEqual([{ persons: 4, price: 320 }]);
  });
  it("oldPrice <= price ise oldPrice'ı atar", () => {
    const raw = JSON.stringify([{ persons: 4, price: 320, oldPrice: 300 }]);
    expect(parsePortions(raw)).toEqual([{ persons: 4, price: 320 }]);
  });
  it("boş/null/bozuk girdide boş dizi döner", () => {
    expect(parsePortions("")).toEqual([]);
    expect(parsePortions(null)).toEqual([]);
    expect(parsePortions("değil-json")).toEqual([]);
    expect(parsePortions(JSON.stringify({}))).toEqual([]);
  });
});

describe("portionLabel", () => {
  it("locale'e göre etiket üretir", () => {
    expect(portionLabel(4, "tr")).toBe("4 kişilik");
    expect(portionLabel(4, "en")).toBe("for 4");
    expect(portionLabel(4, "ar")).toBe("لـ 4 أشخاص");
  });
});

describe("minPortionPrice", () => {
  it("en düşük fiyatı döner", () => {
    expect(minPortionPrice([{ persons: 2, price: 180 }, { persons: 6, price: 450 }])).toBe(180);
  });
  it("boş dizide null döner", () => {
    expect(minPortionPrice([])).toBeNull();
  });
});
