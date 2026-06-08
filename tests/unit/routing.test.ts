import { describe, it, expect } from "vitest";
import { getDir } from "@/i18n/routing";

describe("getDir", () => {
  it("Arapça için rtl döner", () => { expect(getDir("ar")).toBe("rtl"); });
  it("Türkçe için ltr döner", () => { expect(getDir("tr")).toBe("ltr"); });
  it("İngilizce için ltr döner", () => { expect(getDir("en")).toBe("ltr"); });
});
