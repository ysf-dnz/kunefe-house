import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/price";

describe("formatPrice", () => {
  it("para birimi koduna göre sembol kullanır", () => {
    expect(formatPrice(320, "TRY")).toContain("₺");
    expect(formatPrice(10, "USD")).toContain("$");
    expect(formatPrice(36, "QAR", "ar")).toMatch(/ر\.?\s?ق|QAR|﷼/);
  });
  it("null → null", () => { expect(formatPrice(null, "USD")).toBeNull(); });
});
