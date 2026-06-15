import { describe, it, expect } from "vitest";
import { generateTempPassword } from "@/lib/temp-password";

describe("generateTempPassword", () => {
  it("varsayılan 12 hane", () => { expect(generateTempPassword().length).toBe(12); });
  it("istenen uzunlukta", () => { expect(generateTempPassword(16).length).toBe(16); });
  it("her sınıftan en az bir karakter (büyük/küçük/rakam/sembol)", () => {
    const p = generateTempPassword();
    expect(/[A-Z]/.test(p)).toBe(true);
    expect(/[a-z]/.test(p)).toBe(true);
    expect(/[0-9]/.test(p)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(p)).toBe(true);
  });
  it("ardışık çağrılar farklı", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
