import { describe, it, expect } from "vitest";
import { effectiveProduct } from "@/lib/branch-catalog";

describe("effectiveProduct", () => {
  it("override yoksa açık + merkez fiyatı", () => {
    expect(effectiveProduct({ price: 320 }, null)).toEqual({ available: true, stock: null, price: 320 });
  });
  it("available=false → kapalı", () => {
    expect(effectiveProduct({ price: 320 }, { available: false, stock: null, localPrice: null }))
      .toEqual({ available: false, stock: null, price: 320 });
  });
  it("stock=0 → kapalı (available true olsa da)", () => {
    expect(effectiveProduct({ price: 320 }, { available: true, stock: 0, localPrice: null }))
      .toEqual({ available: false, stock: 0, price: 320 });
  });
  it("localPrice doluysa ₺ fiyatı ezilir", () => {
    expect(effectiveProduct({ price: 320 }, { available: true, stock: 5, localPrice: 280 }))
      .toEqual({ available: true, stock: 5, price: 280 });
  });
  it("merkez fiyatı yoksa null kalır", () => {
    expect(effectiveProduct({ price: null }, null)).toEqual({ available: true, stock: null, price: null });
  });
});
