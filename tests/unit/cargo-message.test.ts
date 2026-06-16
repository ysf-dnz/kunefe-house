import { describe, it, expect } from "vitest";
import { buildCargoMessage, carrierTrackUrl } from "@/lib/cargo-message";

describe("cargo-message", () => {
  it("takip no + firma + link içerir (tr)", () => {
    const m = buildCargoMessage({ customerName: "Ali", trackingNo: "123", carrier: "Yurtiçi", locale: "tr" });
    expect(m).toContain("Ali");
    expect(m).toContain("123");
    expect(m).toContain("Yurtiçi");
  });
  it("bilinen firma için takip URL'si döner", () => {
    expect(carrierTrackUrl("Yurtiçi", "123")).toContain("123");
  });
  it("bilinmeyen firma için null", () => {
    expect(carrierTrackUrl("Foo", "1")).toBeNull();
  });
});
