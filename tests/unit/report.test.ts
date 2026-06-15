import { describe, it, expect } from "vitest";
import { rangeStart } from "@/lib/report";

const now = new Date("2026-06-15T14:30:00Z");

describe("rangeStart", () => {
  it("today → günün başı (00:00)", () => {
    const d = rangeStart("today", now)!;
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d <= now).toBe(true);
    // 24 saatten yakın
    expect(now.getTime() - d.getTime()).toBeLessThanOrEqual(24 * 3600 * 1000);
  });
  it("7g → ~7 gün önce", () => {
    const d = rangeStart("7g", now)!;
    expect(Math.round((now.getTime() - d.getTime()) / (24 * 3600 * 1000))).toBe(7);
  });
  it("30g → ~30 gün önce", () => {
    const d = rangeStart("30g", now)!;
    expect(Math.round((now.getTime() - d.getTime()) / (24 * 3600 * 1000))).toBe(30);
  });
  it("all → null (filtre yok)", () => {
    expect(rangeStart("all", now)).toBeNull();
  });
});
