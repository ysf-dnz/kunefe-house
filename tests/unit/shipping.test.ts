import { describe, it, expect } from "vitest";
import { calcShipping } from "@/lib/shipping";

describe("calcShipping", () => {
  it("eşik yokken sabit ücret döner", () => {
    expect(calcShipping(200, { fee: 50, threshold: null })).toBe(50);
  });
  it("eşik altında sabit ücret", () => {
    expect(calcShipping(499, { fee: 50, threshold: 500 })).toBe(50);
  });
  it("eşik veya üstünde bedava", () => {
    expect(calcShipping(500, { fee: 50, threshold: 500 })).toBe(0);
    expect(calcShipping(800, { fee: 50, threshold: 500 })).toBe(0);
  });
  it("ücret tanımsızsa 0 (kargo bedava)", () => {
    expect(calcShipping(100, { fee: null, threshold: null })).toBe(0);
  });
});
