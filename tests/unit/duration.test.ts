import { describe, it, expect } from "vitest";
import { minutesBetween, formatDuration } from "@/lib/duration";

describe("minutesBetween", () => {
  it("iki zaman arası dakikayı yuvarlar", () => {
    const a = new Date("2026-06-14T10:00:00Z");
    const b = new Date("2026-06-14T10:34:20Z");
    expect(minutesBetween(a, b)).toBe(34);
  });
  it("ISO string kabul eder", () => {
    expect(minutesBetween("2026-06-14T10:00:00Z", "2026-06-14T11:05:00Z")).toBe(65);
  });
  it("null/eksik veya ters sırada null döner", () => {
    expect(minutesBetween(null, new Date())).toBeNull();
    expect(minutesBetween(new Date(), null)).toBeNull();
    expect(minutesBetween("2026-06-14T11:00:00Z", "2026-06-14T10:00:00Z")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("60 altı dk gösterir", () => { expect(formatDuration(34)).toBe("34 dk"); });
  it("60 ve üstü sa+dk gösterir", () => {
    expect(formatDuration(65)).toBe("1 sa 5 dk");
    expect(formatDuration(120)).toBe("2 sa");
  });
  it("null/negatif null döner", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(-3)).toBeNull();
  });
});
