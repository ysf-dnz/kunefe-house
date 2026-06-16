"use server";

import { headers } from "next/headers";
import { createShopOrder, type CartLineInput } from "@/lib/shop";
import { paytrToken, encodeBasket } from "@/lib/paytr";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import type { Locale } from "@/lib/i18n-field";

export type CheckoutState = { iframeToken?: string; error?: string };

const s = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const hdrs = await headers();
  if (!(await checkRateLimit("order", clientIp(hdrs)))) return { error: "Çok fazla deneme, biraz sonra tekrar deneyin." };

  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) return { error: "Ödeme şu an kullanılamıyor." };

  const locale = (s(formData.get("locale"), 5) || "tr") as Locale;
  let lines: CartLineInput[] = [];
  try { lines = JSON.parse(s(formData.get("lines"), 5000)); } catch { return { error: "Sepet okunamadı." }; }

  const customer = {
    name: s(formData.get("name"), 120), phone: s(formData.get("phone"), 32), email: s(formData.get("email"), 160),
    city: s(formData.get("city"), 60), district: s(formData.get("district"), 60),
    address: s(formData.get("address"), 1000), postal: s(formData.get("postal"), 12) || null,
  };
  if (!customer.name || !customer.email || !customer.address || (customer.phone.match(/\d/g)?.length ?? 0) < 10) {
    return { error: "Lütfen tüm zorunlu alanları doğru doldurun." };
  }

  const r = await createShopOrder(lines, customer, locale);
  if (!r.ok) {
    if (r.error === "out_of_stock") return { error: "Üzgünüz, bir ürün tükendi. Sepeti güncelleyin." };
    return { error: "Sipariş oluşturulamadı." };
  }

  const userIp = clientIp(hdrs);
  const basket = encodeBasket(r.basket);
  const testMode = process.env.PAYTR_TEST_MODE === "1" ? "1" : "0";
  const token = paytrToken({
    merchantId, merchantKey, merchantSalt, userIp, merchantOid: r.merchantOid,
    email: customer.email, paymentAmount: r.amountKurus, basket, testMode,
  });

  const body = new URLSearchParams({
    merchant_id: merchantId, user_ip: userIp, merchant_oid: r.merchantOid, email: customer.email,
    payment_amount: String(r.amountKurus), paytr_token: token, user_basket: basket,
    debug_on: "0", no_installment: "0", max_installment: "0", user_name: customer.name,
    user_address: `${customer.address} ${customer.district}/${customer.city}`.slice(0, 400),
    user_phone: customer.phone, merchant_ok_url: absUrl(hdrs, `/odeme/sonuc?d=ok`),
    merchant_fail_url: absUrl(hdrs, `/odeme/sonuc?d=fail`), timeout_limit: "30",
    currency: "TL", test_mode: testMode,
  });

  try {
    const res = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body });
    const json = (await res.json()) as { status: string; token?: string; reason?: string };
    if (json.status !== "success" || !json.token) return { error: "Ödeme başlatılamadı: " + (json.reason ?? "") };
    return { iframeToken: json.token };
  } catch {
    return { error: "Ödeme servisine ulaşılamadı." };
  }
}

function absUrl(hdrs: Headers, path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || `https://${hdrs.get("host") ?? "kunefehouse.com"}`;
  return base.replace(/\/$/, "") + path;
}
