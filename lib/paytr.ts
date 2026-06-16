import { createHmac, timingSafeEqual } from "node:crypto";

export type BasketLine = { title: string; price: number; qty: number };

export function toKurus(tl: number): number {
  return Math.round(tl * 100);
}

export function encodeBasket(lines: BasketLine[]): string {
  const arr = lines.map((l) => [l.title, l.price.toFixed(2), l.qty]);
  return Buffer.from(JSON.stringify(arr), "utf8").toString("base64");
}

export type TokenArgs = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmount: number; // kuruş
  basket: string; // encodeBasket çıktısı
  testMode: string; // "0" | "1"
  noInstallment?: string; // "1"
  maxInstallment?: string; // "0"
  currency?: string; // "TL"
};

export function paytrToken(a: TokenArgs): string {
  const noInstallment = a.noInstallment ?? "0";
  const maxInstallment = a.maxInstallment ?? "0";
  const currency = a.currency ?? "TL";
  const str =
    a.merchantId + a.userIp + a.merchantOid + a.email + String(a.paymentAmount) +
    a.basket + noInstallment + maxInstallment + currency + a.testMode + a.merchantSalt;
  return createHmac("sha256", a.merchantKey).update(str).digest("base64");
}

export function verifyCallback(
  post: { merchant_oid: string; status: string; total_amount: string; hash: string },
  merchantKey: string,
  merchantSalt: string
): boolean {
  const expected = createHmac("sha256", merchantKey)
    .update(post.merchant_oid + merchantSalt + post.status + post.total_amount)
    .digest("base64");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(post.hash ?? "");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
