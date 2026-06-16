import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { encodeBasket, paytrToken, verifyCallback, toKurus } from "@/lib/paytr";

const creds = { merchantId: "100000", merchantKey: "KEY", merchantSalt: "SALT" };

describe("paytr", () => {
  it("toKurus TL'yi kuruşa çevirir (yuvarlar)", () => {
    expect(toKurus(149.9)).toBe(14990);
    expect(toKurus(10)).toBe(1000);
  });
  it("encodeBasket base64 JSON üretir", () => {
    const b = encodeBasket([{ title: "Künefe", price: 100, qty: 2 }]);
    const decoded = JSON.parse(Buffer.from(b, "base64").toString("utf8"));
    expect(decoded).toEqual([["Künefe", "100.00", 2]]);
  });
  it("paytrToken deterministik (aynı girdi → aynı token)", () => {
    const args = {
      ...creds, userIp: "1.2.3.4", merchantOid: "OID1", email: "a@b.co",
      paymentAmount: 14990, basket: encodeBasket([{ title: "X", price: 149.9, qty: 1 }]),
      testMode: "1",
    };
    expect(paytrToken(args)).toBe(paytrToken(args));
    expect(paytrToken(args)).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
  it("verifyCallback doğru hash'i kabul, yanlışı reddeder", () => {
    const post = { merchant_oid: "OID1", status: "success", total_amount: "14990" };
    const good = createHmac("sha256", creds.merchantKey)
      .update("OID1" + creds.merchantSalt + "success" + "14990")
      .digest("base64");
    expect(verifyCallback({ ...post, hash: good }, creds.merchantKey, creds.merchantSalt)).toBe(true);
    expect(verifyCallback({ ...post, hash: "WRONG" }, creds.merchantKey, creds.merchantSalt)).toBe(false);
  });
});
