import { describe, it, expect } from "vitest";
import { currencyForLocale, productPriceForLocale, portionPriceForLocale, minPortionPriceForLocale } from "@/lib/currency";

const prod = { price: 320, oldPrice: 380, priceUsd: 10, oldPriceUsd: 12, priceQar: null, oldPriceQar: null };

describe("currencyForLocale", () => {
  it("dile göre para birimi kodu", () => {
    expect(currencyForLocale("tr")).toBe("TRY");
    expect(currencyForLocale("en")).toBe("USD");
    expect(currencyForLocale("ar")).toBe("QAR");
  });
});
describe("productPriceForLocale", () => {
  it("tr → TRY", () => { expect(productPriceForLocale(prod, "tr")).toEqual({ price: 320, oldPrice: 380 }); });
  it("en → USD", () => { expect(productPriceForLocale(prod, "en")).toEqual({ price: 10, oldPrice: 12 }); });
  it("ar → boşsa null", () => { expect(productPriceForLocale(prod, "ar")).toEqual({ price: null, oldPrice: null }); });
});
describe("portionPriceForLocale", () => {
  const p = { persons: 4, price: 320, oldPrice: 380, usd: 10, qar: 36 };
  it("en → usd", () => { expect(portionPriceForLocale(p, "en")).toEqual({ price: 10, oldPrice: null }); });
  it("ar → qar", () => { expect(portionPriceForLocale(p, "ar")).toEqual({ price: 36, oldPrice: null }); });
  it("tr → price", () => { expect(portionPriceForLocale(p, "tr")).toEqual({ price: 320, oldPrice: 380 }); });
});
describe("minPortionPriceForLocale", () => {
  it("aktif para biriminde en düşük dolu fiyat", () => {
    const ps = [{ persons: 2, price: 180, usd: 6 }, { persons: 4, price: 320, usd: 10 }];
    expect(minPortionPriceForLocale(ps, "en")).toBe(6);
    expect(minPortionPriceForLocale(ps, "tr")).toBe(180);
  });
  it("o para biriminde hiç fiyat yoksa null", () => {
    expect(minPortionPriceForLocale([{ persons: 2, price: 180 }], "en")).toBeNull();
  });
});
