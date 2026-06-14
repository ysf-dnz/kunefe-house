import { describe, it, expect } from "vitest";
import { isValidLatLng, isCourierLive } from "@/lib/geo";

describe("isValidLatLng", () => {
  it("geçerli koordinatı kabul eder", () => {
    expect(isValidLatLng(41.01, 28.97)).toBe(true);
    expect(isValidLatLng(-90, -180)).toBe(true);
    expect(isValidLatLng(90, 180)).toBe(true);
  });
  it("aralık dışını reddeder", () => {
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, 181)).toBe(false);
    expect(isValidLatLng(-91, 0)).toBe(false);
  });
  it("sayı olmayanı reddeder", () => {
    expect(isValidLatLng(NaN, 0)).toBe(false);
    expect(isValidLatLng(0, Infinity)).toBe(false);
  });
});

describe("isCourierLive", () => {
  const now = 1_000_000_000_000;
  it("eşik içindeyse canlı", () => {
    expect(isCourierLive(new Date(now - 2 * 60 * 1000).toISOString(), now)).toBe(true);
  });
  it("eşik dışındaysa canlı değil", () => {
    expect(isCourierLive(new Date(now - 10 * 60 * 1000).toISOString(), now)).toBe(false);
  });
  it("null/undefined canlı değil", () => {
    expect(isCourierLive(null, now)).toBe(false);
    expect(isCourierLive(undefined, now)).toBe(false);
  });
});
