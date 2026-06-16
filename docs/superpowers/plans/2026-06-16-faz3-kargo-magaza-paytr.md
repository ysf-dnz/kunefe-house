# Faz 3 — Kargo Mağazası (Sepet + PayTR + WhatsApp Takip) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tüm Türkiye'ye kargoyla ürün satışı: ayrı `/magaza` kataloğu, çok ürünlü sepet, PayTR güvenli iFrame ödeme, ödenmiş siparişlerin merkez tarafından kargolanıp müşteriye WhatsApp ile takip no iletimi, basit merkezi stok takibi.

**Architecture:** Saf PayTR hash/basket fonksiyonları (`lib/paytr.ts`, TDD) + saf kargo ücreti hesabı (`lib/shipping.ts`, TDD) çekirdekte. Sepet client-side (localStorage context). Sunucu tarafı: `lib/shop.ts` siparişi DB fiyatlarından doğrulayıp oluşturur; PayTR token action'da çağrılır; ödeme yalnız `/api/paytr/callback` webhook'unda hash doğrulamasıyla onaylanır (Node runtime, idempotent, stok `$transaction` içinde düşer). Mevcut yerel WhatsApp sipariş akışına dokunulmaz.

**Tech Stack:** Next.js 16 (App Router, Server Actions, route handlers), Prisma 7 + adapter-pg, NextAuth v5 (requireHQ), next-intl (tr/en/ar), Tailwind v4, Vitest (TDD), node:crypto (HMAC), Upstash ratelimit.

**Spec:** `docs/superpowers/specs/2026-06-16-faz3-kargo-magaza-paytr-design.md`

---

## File Structure

**Yeni:**
- `lib/paytr.ts` — PayTR token gövdesi + hash üretimi, callback hash doğrulama, basket kodlama (saf).
- `lib/shipping.ts` — kargo ücreti hesabı (sabit + bedava eşiği) (saf).
- `lib/cart.ts` — sepet tip + saf yardımcılar (subtotal, normalize).
- `lib/shop.ts` — `createShopOrder` (sunucu fiyat/stok doğrulama + DB yazımı), `getShopOrders`, `markShopOrderShipped`.
- `lib/cargo-message.ts` — müşteriye WhatsApp kargo mesajı (çok dilli) (saf).
- `lib/cargo-catalog.ts` — `getCargoProducts` (mağaza listesi).
- `components/shop/CartProvider.tsx` — client context + localStorage.
- `components/shop/AddToCartButton.tsx`, `components/shop/CartIcon.tsx`, `components/shop/PaytrFrame.tsx`, `components/shop/CheckoutForm.tsx`.
- `app/[locale]/magaza/page.tsx`, `app/[locale]/sepet/page.tsx` (+`CartView` client), `app/[locale]/odeme/page.tsx`, `app/[locale]/odeme/actions.ts`, `app/[locale]/odeme/sonuc/page.tsx`.
- `app/api/paytr/callback/route.ts`.
- `app/[locale]/admin/kargo-siparisler/page.tsx` + `actions.ts` + `ShipForm.tsx`.
- Testler: `tests/unit/paytr.test.ts`, `tests/unit/shipping.test.ts`, `tests/unit/cart.test.ts`, `tests/unit/cargo-message.test.ts`.

**Değişecek:**
- `prisma/schema.prisma` (+migration) — Product/SiteSettings alanları, ShopOrder/ShopOrderItem.
- `components/admin/ProductForm.tsx` + `app/[locale]/admin/urunler/actions.ts` — cargoAvailable/cargoStock.
- `app/[locale]/admin/urunler/[id]/page.tsx` — yeni alanları geç.
- `app/[locale]/admin/ayarlar/page.tsx` + `actions.ts` — kargo ayarları.
- `app/[locale]/admin/layout.tsx` — "Kargo Siparişleri" linki (HQ).
- `app/[locale]/layout.tsx` — `<CartProvider>` sarmalayıcı.
- `components/layout/HeaderClient.tsx` — sepet ikonu + Mağaza linki (cargoEnabled iken).
- `i18n/messages/{tr,en,ar}.json` — `shop`, `cart`, `checkout`, `cargoAdmin` namespace'leri.

---

## Task 1: Prisma şeması — kargo alanları + ShopOrder/ShopOrderItem

**Files:**
- Modify: `prisma/schema.prisma`
- Migration: `prisma/migrations/<timestamp>_faz3_kargo/migration.sql` (prisma üretir)

- [ ] **Step 1: Product modeline kargo alanları ekle**

`prisma/schema.prisma` içinde `model Product` bloğuna (mevcut `portions Json?` satırından sonra) ekle:

```prisma
  cargoAvailable    Boolean          @default(false)
  cargoStock        Int?
  shopItems         ShopOrderItem[]
```

- [ ] **Step 2: SiteSettings'e kargo ayarları ekle**

`model SiteSettings` içine (`enabledLocales` satırından sonra) ekle:

```prisma
  cargoEnabled          Boolean  @default(false)
  shippingFee           Decimal? @db.Decimal(10, 2)
  freeShippingThreshold Decimal? @db.Decimal(10, 2)
```

- [ ] **Step 3: Branch'e ters ilişki ekle**

`model Branch` içindeki ilişkiler listesine (`applications` satırından sonra) ekle:

```prisma
  shopOrders     ShopOrder[]
```

- [ ] **Step 4: ShopOrder ve ShopOrderItem modellerini ekle**

`prisma/schema.prisma` sonuna ekle:

```prisma
model ShopOrder {
  id            String          @id @default(cuid())
  merchantOid   String          @unique
  status        String          @default("pending_payment")
  customerName  String
  customerPhone String
  customerEmail String
  addressCity   String
  addressDistrict String
  addressFull   String
  addressPostal String?
  subtotal      Decimal         @db.Decimal(10, 2)
  shippingFee   Decimal         @db.Decimal(10, 2)
  total         Decimal         @db.Decimal(10, 2)
  currency      String          @default("TRY")
  paytrStatus   String?
  paidAt        DateTime?
  trackingNo    String?
  carrier       String?
  shippedAt     DateTime?
  branchId      String?
  branch        Branch?         @relation(fields: [branchId], references: [id], onDelete: SetNull)
  items         ShopOrderItem[]
  createdAt     DateTime        @default(now())
}

model ShopOrderItem {
  id          String    @id @default(cuid())
  shopOrderId String
  shopOrder   ShopOrder @relation(fields: [shopOrderId], references: [id], onDelete: Cascade)
  productId   String?
  product     Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  title       String
  unitPrice   Decimal   @db.Decimal(10, 2)
  qty         Int
  lineTotal   Decimal   @db.Decimal(10, 2)
}
```

- [ ] **Step 5: Migration oluştur ve uygula**

Run: `npx prisma migrate dev --name faz3_kargo`
Expected: "Your database is now in sync with your schema" + Prisma Client yeniden üretilir.

- [ ] **Step 6: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS (sıfır hata).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): Faz 3 kargo alanları + ShopOrder/ShopOrderItem"
```

---

## Task 2: Kargo ücreti hesabı (`lib/shipping.ts`, TDD)

**Files:**
- Create: `lib/shipping.ts`
- Test: `tests/unit/shipping.test.ts`

- [ ] **Step 1: Başarısız test yaz**

`tests/unit/shipping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calcShipping } from "@/lib/shipping";

describe("calcShipping", () => {
  it("eşik yokken sabit ücret döner", () => {
    expect(calcShipping(200, { fee: 50, threshold: null })).toBe(50);
  });
  it("eşik altında sabit ücret", () => {
    expect(calcShipping(499, { fee: 50, threshold: 500 })).toBe(50);
  });
  it("eşik veya üstünde bedava", () => {
    expect(calcShipping(500, { fee: 50, threshold: 500 })).toBe(0);
    expect(calcShipping(800, { fee: 50, threshold: 500 })).toBe(0);
  });
  it("ücret tanımsızsa 0 (kargo bedava)", () => {
    expect(calcShipping(100, { fee: null, threshold: null })).toBe(0);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx vitest run tests/unit/shipping.test.ts`
Expected: FAIL ("calcShipping is not a function" / modül yok).

- [ ] **Step 3: Minimal implementasyon yaz**

`lib/shipping.ts`:

```ts
export type ShippingConfig = { fee: number | null; threshold: number | null };

/** Ara toplama göre kargo ücreti (₺). fee yoksa 0; threshold doluysa ve subtotal>=threshold ise 0. */
export function calcShipping(subtotal: number, cfg: ShippingConfig): number {
  if (cfg.fee == null || cfg.fee <= 0) return 0;
  if (cfg.threshold != null && subtotal >= cfg.threshold) return 0;
  return cfg.fee;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx vitest run tests/unit/shipping.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add lib/shipping.ts tests/unit/shipping.test.ts
git commit -m "feat: kargo ücreti hesabı calcShipping (TDD)"
```

---

## Task 3: Sepet çekirdek mantığı (`lib/cart.ts`, TDD)

**Files:**
- Create: `lib/cart.ts`
- Test: `tests/unit/cart.test.ts`

- [ ] **Step 1: Başarısız test yaz**

`tests/unit/cart.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cartSubtotal, cartCount, addItem, type CartItem } from "@/lib/cart";

const a: CartItem = { productId: "p1", title: "Künefe", price: 100, qty: 2, imageUrl: null };
const b: CartItem = { productId: "p2", title: "Baklava", price: 50, qty: 1, imageUrl: null };

describe("cart", () => {
  it("ara toplam = fiyat*adet toplamı", () => {
    expect(cartSubtotal([a, b])).toBe(250);
  });
  it("adet = qty toplamı", () => {
    expect(cartCount([a, b])).toBe(3);
  });
  it("addItem aynı ürünü artırır, yenisini ekler", () => {
    const r1 = addItem([a], { ...a, qty: 1 });
    expect(r1).toHaveLength(1);
    expect(r1[0].qty).toBe(3);
    const r2 = addItem([a], b);
    expect(r2).toHaveLength(2);
  });
  it("qty 99 ile sınırlanır", () => {
    const r = addItem([{ ...a, qty: 98 }], { ...a, qty: 5 });
    expect(r[0].qty).toBe(99);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx vitest run tests/unit/cart.test.ts`
Expected: FAIL (modül yok).

- [ ] **Step 3: Minimal implementasyon yaz**

`lib/cart.ts`:

```ts
export type CartItem = {
  productId: string;
  title: string;
  price: number;
  qty: number;
  imageUrl: string | null;
};

export const MAX_QTY = 99;

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

export function addItem(items: CartItem[], next: CartItem): CartItem[] {
  const i = items.findIndex((x) => x.productId === next.productId);
  if (i === -1) return [...items, { ...next, qty: Math.min(next.qty, MAX_QTY) }];
  const copy = items.slice();
  copy[i] = { ...copy[i], qty: Math.min(copy[i].qty + next.qty, MAX_QTY) };
  return copy;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx vitest run tests/unit/cart.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add lib/cart.ts tests/unit/cart.test.ts
git commit -m "feat: sepet çekirdek mantığı (TDD)"
```

---

## Task 4: PayTR hash & basket (`lib/paytr.ts`, TDD)

**Files:**
- Create: `lib/paytr.ts`
- Test: `tests/unit/paytr.test.ts`

PayTR iFrame: `paytr_token = base64(HMAC-SHA256(merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode + merchant_salt, merchant_key))`. Callback: `hash = base64(HMAC-SHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key))`. `payment_amount` ve `total_amount` **kuruş** (TL*100, tam sayı).

- [ ] **Step 1: Başarısız test yaz**

`tests/unit/paytr.test.ts`:

```ts
import { describe, it, expect } from "vitest";
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
    const good = require("crypto")
      .createHmac("sha256", creds.merchantKey)
      .update("OID1" + creds.merchantSalt + "success" + "14990")
      .digest("base64");
    expect(verifyCallback({ ...post, hash: good }, creds.merchantKey, creds.merchantSalt)).toBe(true);
    expect(verifyCallback({ ...post, hash: "WRONG" }, creds.merchantKey, creds.merchantSalt)).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx vitest run tests/unit/paytr.test.ts`
Expected: FAIL (modül yok).

- [ ] **Step 3: Minimal implementasyon yaz**

`lib/paytr.ts`:

```ts
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
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx vitest run tests/unit/paytr.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add lib/paytr.ts tests/unit/paytr.test.ts
git commit -m "feat: PayTR token/hash/basket (TDD)"
```

---

## Task 5: Kargo WhatsApp mesajı (`lib/cargo-message.ts`, TDD)

**Files:**
- Create: `lib/cargo-message.ts`
- Test: `tests/unit/cargo-message.test.ts`

- [ ] **Step 1: Başarısız test yaz**

`tests/unit/cargo-message.test.ts`:

```ts
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
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx vitest run tests/unit/cargo-message.test.ts`
Expected: FAIL (modül yok).

- [ ] **Step 3: Minimal implementasyon yaz**

`lib/cargo-message.ts`:

```ts
import type { Locale } from "@/lib/i18n-field";

const TRACK: Record<string, (no: string) => string> = {
  "Yurtiçi": (no) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`,
  "Aras": (no) => `https://kargotakip.araskargo.com.tr/?tracking=${no}`,
  "MNG": (no) => `https://www.mngkargo.com.tr/gonderi-takip?takipNo=${no}`,
  "PTT": (no) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${no}`,
  "Sürat": (no) => `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${no}`,
};

export const CARRIERS = Object.keys(TRACK);

export function carrierTrackUrl(carrier: string, no: string): string | null {
  const fn = TRACK[carrier];
  return fn ? fn(no) : null;
}

export function buildCargoMessage(p: {
  customerName: string; trackingNo: string; carrier: string; locale: Locale;
}): string {
  const url = carrierTrackUrl(p.carrier, p.trackingNo);
  const tail = url ? `\n${url}` : "";
  if (p.locale === "en") {
    return `Hello ${p.customerName}, your Kunefe House order has shipped! 🚚\nCarrier: ${p.carrier}\nTracking no: ${p.trackingNo}${tail}`;
  }
  if (p.locale === "ar") {
    return `مرحباً ${p.customerName}، تم شحن طلبك من Kunefe House! 🚚\nشركة الشحن: ${p.carrier}\nرقم التتبع: ${p.trackingNo}${tail}`;
  }
  return `Merhaba ${p.customerName}, Kunefe House siparişiniz kargoya verildi! 🚚\nFirma: ${p.carrier}\nTakip no: ${p.trackingNo}${tail}`;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx vitest run tests/unit/cargo-message.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add lib/cargo-message.ts tests/unit/cargo-message.test.ts
git commit -m "feat: kargo WhatsApp mesajı + firma takip URL'leri (TDD)"
```

---

## Task 6: Mağaza katalog sorgusu + ayarlar yardımcısı (`lib/cargo-catalog.ts`)

**Files:**
- Create: `lib/cargo-catalog.ts`

- [ ] **Step 1: getCargoProducts ve getShippingConfig yaz**

`lib/cargo-catalog.ts`:

```ts
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import type { ShippingConfig } from "@/lib/shipping";

/** Mağazada listelenecek kargo ürünleri: işaretli + (stok null veya >0). */
export const getCargoProducts = cache(async () => {
  return prisma.product.findMany({
    where: {
      cargoAvailable: true,
      OR: [{ cargoStock: null }, { cargoStock: { gt: 0 } }],
    },
    orderBy: { order: "asc" },
    select: {
      id: true, title: true, slug: true, shortDescription: true,
      primaryImageUrl: true, price: true, oldPrice: true, cargoStock: true,
    },
  });
});

export async function getShippingConfig(): Promise<ShippingConfig> {
  const s = await getSiteSettings().catch(() => null);
  return {
    fee: s?.shippingFee != null ? Number(s.shippingFee) : null,
    threshold: s?.freeShippingThreshold != null ? Number(s.freeShippingThreshold) : null,
  };
}

export async function isCargoEnabled(): Promise<boolean> {
  const s = await getSiteSettings().catch(() => null);
  return !!s?.cargoEnabled;
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/cargo-catalog.ts
git commit -m "feat: kargo katalog sorgusu + kargo ayarı yardımcıları"
```

---

## Task 7: Sepet sağlayıcı (CartProvider) + i18n namespace iskeleti

**Files:**
- Create: `components/shop/CartProvider.tsx`
- Modify: `app/[locale]/layout.tsx`
- Modify: `i18n/messages/tr.json`, `i18n/messages/en.json`, `i18n/messages/ar.json`

- [ ] **Step 1: CartProvider yaz**

`components/shop/CartProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addItem, cartCount, cartSubtotal, MAX_QTY, type CartItem } from "@/lib/cart";

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "kh_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* yoksay */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* yoksay */ }
  }, [items]);

  const add = (item: CartItem) => setItems((cur) => addItem(cur, item));
  const setQty = (productId: string, qty: number) =>
    setItems((cur) =>
      cur
        .map((i) => (i.productId === productId ? { ...i, qty: Math.max(0, Math.min(qty, MAX_QTY)) } : i))
        .filter((i) => i.qty > 0)
    );
  const remove = (productId: string) => setItems((cur) => cur.filter((i) => i.productId !== productId));
  const clear = () => setItems([]);

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, count: cartCount(items), subtotal: cartSubtotal(items) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
```

- [ ] **Step 2: layout.tsx'i CartProvider ile sarmala**

`app/[locale]/layout.tsx` içinde import ekle ve `<body>` içeriğindeki ana sarmalayıcıyı (Header + children + Footer'ı kapsayan en dış öğe) `<CartProvider>...</CartProvider>` ile sar. Import:

```tsx
import { CartProvider } from "@/components/shop/CartProvider";
```

(Mevcut sağlayıcı/sarmalayıcı yapısını koru; CartProvider'ı NextIntlClientProvider'ın içine, children'ı saran en yakın seviyeye yerleştir.)

- [ ] **Step 3: i18n namespace'lerini ekle (tr.json)**

`i18n/messages/tr.json` köküne ekle:

```json
"shop": {
  "title": "Kargo Mağazası",
  "subtitle": "Tüm Türkiye'ye kapınıza kadar.",
  "addToCart": "Sepete Ekle",
  "added": "Sepete eklendi ✓",
  "soldOut": "Tükendi",
  "empty": "Mağaza şu an kapalı.",
  "viewCart": "Sepeti Gör"
},
"cart": {
  "title": "Sepetim",
  "empty": "Sepetiniz boş.",
  "remove": "Kaldır",
  "subtotal": "Ara Toplam",
  "shipping": "Kargo",
  "free": "Ücretsiz",
  "total": "Toplam",
  "checkout": "Ödemeye Geç",
  "qty": "Adet"
},
"checkout": {
  "title": "Teslimat & Ödeme",
  "name": "Ad Soyad",
  "phone": "Telefon",
  "email": "E-posta",
  "city": "İl",
  "district": "İlçe",
  "address": "Açık Adres",
  "postal": "Posta Kodu (opsiyonel)",
  "pay": "Ödemeye Geç",
  "required": "Ad, telefon, e-posta ve adres zorunludur.",
  "processing": "Ödeme hazırlanıyor...",
  "successTitle": "Siparişiniz alındı! 🎉",
  "successBody": "Ödemeniz onaylandı. Kargoya verilince takip numarası WhatsApp ile gönderilecek.",
  "failTitle": "Ödeme tamamlanamadı",
  "failBody": "Bir sorun oluştu. Sepetiniz korunuyor, tekrar deneyebilirsiniz.",
  "outOfStock": "Üzgünüz, seçtiğiniz bir ürün tükendi. Lütfen sepeti güncelleyin."
},
"cargoAdmin": {
  "title": "Kargo Siparişleri",
  "trackingNo": "Takip No",
  "carrier": "Kargo Firması",
  "save": "Kaydet & Kargolandı",
  "sendWhatsapp": "Müşteriye WhatsApp Gönder",
  "markDelivered": "Teslim Edildi",
  "status": "Durum"
}
```

- [ ] **Step 4: Aynı namespace'leri en.json'a ekle (İngilizce değerlerle)**

`i18n/messages/en.json` köküne yukarıdakinin İngilizce karşılığını ekle (aynı anahtarlar; örn. `"title": "Cargo Store"`, `"addToCart": "Add to Cart"`, `"soldOut": "Sold out"`, `"checkout"→"Delivery & Payment"`, `"pay": "Proceed to Payment"`, vb.). Tüm anahtarlar birebir aynı olmalı.

- [ ] **Step 5: Aynı namespace'leri ar.json'a ekle (Arapça değerlerle)**

`i18n/messages/ar.json` köküne Arapça karşılıkları ekle (aynı anahtarlar; örn. `"title": "متجر الشحن"`, `"addToCart": "أضف إلى السلة"`, `"soldOut": "نفد"`, vb.).

- [ ] **Step 6: Tip + build kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/shop/CartProvider.tsx app/[locale]/layout.tsx i18n/messages
git commit -m "feat(shop): CartProvider + sepet/mağaza/ödeme i18n namespace'leri"
```

---

## Task 8: Mağaza sayfası + AddToCartButton + CartIcon + header linki

**Files:**
- Create: `components/shop/AddToCartButton.tsx`, `components/shop/CartIcon.tsx`
- Create: `app/[locale]/magaza/page.tsx`
- Modify: `components/layout/HeaderClient.tsx`

- [ ] **Step 1: AddToCartButton yaz**

`components/shop/AddToCartButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";
import type { CartItem } from "@/lib/cart";

export function AddToCartButton({ item, soldOut }: { item: CartItem; soldOut?: boolean }) {
  const t = useTranslations("shop");
  const { add } = useCart();
  const [done, setDone] = useState(false);
  if (soldOut) {
    return <span className="rounded-full bg-cream/10 px-5 py-2 text-sm text-cream/40">{t("soldOut")}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => { add(item); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="btn-gold rounded-full px-5 py-2 text-sm font-semibold"
    >
      {done ? t("added") : t("addToCart")}
    </button>
  );
}
```

- [ ] **Step 2: CartIcon yaz**

`components/shop/CartIcon.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartIcon({ href }: { href: string }) {
  const { count } = useCart();
  return (
    <Link href={href} className="relative inline-flex items-center text-cream hover:text-gold" aria-label="Sepet">
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <path d="M3 3h2l2.4 12.3a1 1 0 0 0 1 .7h9.2a1 1 0 0 0 1-.8L21 7H6" />
        <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-forest-deep">
          {count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Mağaza sayfasını yaz**

`app/[locale]/magaza/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { localize, type Locale } from "@/lib/i18n-field";
import { formatPrice } from "@/lib/price";
import { getCargoProducts, isCargoEnabled } from "@/lib/cargo-catalog";
import { AddToCartButton } from "@/components/shop/AddToCartButton";

export default async function MagazaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isCargoEnabled())) notFound();
  const t = await getTranslations("shop");
  const loc = locale as Locale;
  const products = await getCargoProducts();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center font-serif text-3xl text-gold-gradient md:text-4xl">{t("title")}</h1>
      <p className="mt-3 text-center text-cream/70">{t("subtitle")}</p>
      <div className="mx-auto mt-4 mb-10 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      {products.length === 0 ? (
        <p className="text-center text-cream/60">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const price = p.price != null ? Number(p.price) : null;
            const name = localize(p.title as Record<string, string>, loc);
            return (
              <div key={p.id} className="card-premium flex flex-col overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/3] bg-forest">
                  {p.primaryImageUrl && <Image src={p.primaryImageUrl} alt={name} fill className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h2 className="font-serif text-lg text-cream">{name}</h2>
                  {price != null && <span className="font-serif text-2xl text-gold">{formatPrice(price, "TRY")}</span>}
                  <div className="mt-auto">
                    <AddToCartButton
                      item={{ productId: p.id, title: name, price: price ?? 0, qty: 1, imageUrl: p.primaryImageUrl }}
                      soldOut={price == null}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Header'a Mağaza linki + sepet ikonu ekle**

`components/layout/HeaderClient.tsx`: nav linkleri dizisine Mağaza linkini ekle (mevcut `t("...")` deseniyle, href `/magaza`) ve sağ tarafa `<CartIcon href="/sepet" />` yerleştir. İmport:

```tsx
import { CartIcon } from "@/components/shop/CartIcon";
```

(Not: Mağaza linkini her zaman göster; `/magaza` cargoEnabled değilse zaten `notFound()` döner. Sepet ikonunu mevcut sağ blok—dil seçici/Şube seç—yanına ekle.)

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully", `/[locale]/magaza` rotası listelenir.

- [ ] **Step 6: Commit**

```bash
git add components/shop app/[locale]/magaza components/layout/HeaderClient.tsx
git commit -m "feat(shop): mağaza sayfası + sepete ekle + header sepet ikonu"
```

---

## Task 9: Sepet sayfası (`/sepet`)

**Files:**
- Create: `app/[locale]/sepet/page.tsx`, `components/shop/CartView.tsx`

- [ ] **Step 1: CartView (client) yaz**

`components/shop/CartView.tsx`:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";
import { calcShipping, type ShippingConfig } from "@/lib/shipping";
import { formatPrice } from "@/lib/price";

export function CartView({ shipping }: { shipping: ShippingConfig }) {
  const t = useTranslations("cart");
  const { items, setQty, remove, subtotal } = useCart();

  if (items.length === 0) {
    return <p className="text-center text-cream/60">{t("empty")}</p>;
  }
  const fee = calcShipping(subtotal, shipping);
  const total = subtotal + fee;

  return (
    <div className="mx-auto max-w-2xl">
      <ul className="flex flex-col gap-4">
        {items.map((i) => (
          <li key={i.productId} className="card-premium flex items-center gap-4 rounded-xl p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-forest">
              {i.imageUrl && <Image src={i.imageUrl} alt={i.title} fill className="object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-cream">{i.title}</p>
              <p className="text-sm text-gold">{formatPrice(i.price, "TRY")}</p>
            </div>
            <input type="number" min={1} max={99} value={i.qty}
              onChange={(e) => setQty(i.productId, Number(e.target.value))}
              className="w-16 rounded border border-copper/40 bg-forest px-2 py-1 text-center text-cream" />
            <button type="button" onClick={() => remove(i.productId)} className="text-sm text-red-400">{t("remove")}</button>
          </li>
        ))}
      </ul>

      <div className="card-premium mt-6 flex flex-col gap-2 rounded-xl p-5">
        <div className="flex justify-between text-cream/80"><span>{t("subtotal")}</span><span>{formatPrice(subtotal, "TRY")}</span></div>
        <div className="flex justify-between text-cream/80"><span>{t("shipping")}</span><span>{fee === 0 ? t("free") : formatPrice(fee, "TRY")}</span></div>
        <div className="flex justify-between border-t border-copper/30 pt-2 text-lg font-semibold text-gold"><span>{t("total")}</span><span>{formatPrice(total, "TRY")}</span></div>
        <Link href="/odeme" className="btn-gold mt-3 rounded-full px-6 py-3 text-center text-sm font-semibold">{t("checkout")}</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sepet sayfasını yaz**

`app/[locale]/sepet/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CartView } from "@/components/shop/CartView";
import { getShippingConfig, isCargoEnabled } from "@/lib/cargo-catalog";

export default async function SepetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isCargoEnabled())) notFound();
  const t = await getTranslations("cart");
  const shipping = await getShippingConfig();
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 text-center font-serif text-3xl text-gold-gradient">{t("title")}</h1>
      <CartView shipping={shipping} />
    </section>
  );
}
```

- [ ] **Step 3: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully", `/[locale]/sepet` listelenir.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/sepet components/shop/CartView.tsx
git commit -m "feat(shop): sepet sayfası (adet/sil/toplam/kargo)"
```

---

## Task 10: Sunucu sipariş oluşturma + PayTR token (`lib/shop.ts` + `odeme/actions.ts`)

**Files:**
- Create: `lib/shop.ts`
- Create: `app/[locale]/odeme/actions.ts`

`createShopOrder` istemci sepetini **görmezden gelir**; sadece `[{productId, qty}]` alır, fiyatı/stoğu DB'den okur, toplamı sunucuda hesaplar.

- [ ] **Step 1: lib/shop.ts yaz**

`lib/shop.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { getShippingConfig } from "@/lib/cargo-catalog";
import { calcShipping } from "@/lib/shipping";
import { localize } from "@/lib/i18n-field";
import type { Locale } from "@/lib/i18n-field";

export type CartLineInput = { productId: string; qty: number };
export type CustomerInput = {
  name: string; phone: string; email: string;
  city: string; district: string; address: string; postal: string | null;
};

export type CreateResult =
  | { ok: true; orderId: string; merchantOid: string; amountKurus: number; basket: { title: string; price: number; qty: number }[]; total: number }
  | { ok: false; error: "empty" | "out_of_stock" | "invalid" };

const HQ_NAME = "Merkez";

/** Sepeti DB fiyat/stok ile doğrular, ShopOrder(pending_payment) + items oluşturur. Tutar SUNUCUDA hesaplanır. */
export async function createShopOrder(
  lines: CartLineInput[],
  customer: CustomerInput,
  locale: Locale
): Promise<CreateResult> {
  const clean = lines
    .filter((l) => l.productId && Number.isFinite(l.qty) && l.qty > 0)
    .map((l) => ({ productId: l.productId, qty: Math.min(Math.round(l.qty), 99) }));
  if (clean.length === 0) return { ok: false, error: "empty" };

  const products = await prisma.product.findMany({
    where: { id: { in: clean.map((l) => l.productId) }, cargoAvailable: true },
    select: { id: true, title: true, price: true, cargoStock: true },
  });

  const items: { productId: string; title: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
  for (const l of clean) {
    const p = products.find((x) => x.id === l.productId);
    if (!p || p.price == null) return { ok: false, error: "invalid" };
    if (p.cargoStock != null && p.cargoStock < l.qty) return { ok: false, error: "out_of_stock" };
    const unit = Number(p.price);
    const title = localize(p.title as Record<string, string>, locale) || "Ürün";
    items.push({ productId: p.id, title, unitPrice: unit, qty: l.qty, lineTotal: unit * l.qty });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const fee = calcShipping(subtotal, await getShippingConfig());
  const total = subtotal + fee;
  const merchantOid = "KH" + Date.now().toString(36).toUpperCase() + Math.floor(performance.now()).toString(36).toUpperCase();
  const hq = await prisma.branch.findFirst({ where: { name: HQ_NAME }, select: { id: true } });

  const order = await prisma.shopOrder.create({
    data: {
      merchantOid, status: "pending_payment",
      customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email,
      addressCity: customer.city, addressDistrict: customer.district, addressFull: customer.address, addressPostal: customer.postal,
      subtotal, shippingFee: fee, total, currency: "TRY",
      branchId: hq?.id ?? null,
      items: { create: items.map((i) => ({ productId: i.productId, title: i.title, unitPrice: i.unitPrice, qty: i.qty, lineTotal: i.lineTotal })) },
    },
  });

  return { ok: true, orderId: order.id, merchantOid, amountKurus: Math.round(total * 100), basket: items.map((i) => ({ title: i.title, price: i.unitPrice, qty: i.qty })), total };
}

export const getShopOrders = async () =>
  prisma.shopOrder.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } });

export async function markShopOrderShipped(id: string, trackingNo: string, carrier: string) {
  await prisma.shopOrder.update({
    where: { id },
    data: { trackingNo, carrier, status: "shipped", shippedAt: new Date() },
  });
}
```

> Not: `merchantOid` yalnız harf+rakam olmalı (PayTR kuralı); yukarıdaki üretim buna uyar. `Date.now()`/`performance.now()` server action içinde çalışır (build değil).

- [ ] **Step 2: odeme/actions.ts yaz (PayTR token al)**

`app/[locale]/odeme/actions.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { createShopOrder, type CartLineInput } from "@/lib/shop";
import { paytrToken, encodeBasket, toKurus } from "@/lib/paytr";
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
```

- [ ] **Step 3: tsc kontrolü**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/shop.ts app/[locale]/odeme/actions.ts
git commit -m "feat(shop): sunucu sipariş oluşturma (DB fiyat/stok doğrulama) + PayTR token alma"
```

---

## Task 11: Ödeme sayfası (CheckoutForm + PaytrFrame)

**Files:**
- Create: `components/shop/CheckoutForm.tsx`, `components/shop/PaytrFrame.tsx`
- Create: `app/[locale]/odeme/page.tsx`

- [ ] **Step 1: PaytrFrame yaz**

`components/shop/PaytrFrame.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function PaytrFrame({ token }: { token: string }) {
  useEffect(() => {
    const sc = document.createElement("script");
    sc.src = "https://www.paytr.com/js/iframeResizer.min.js";
    sc.async = true;
    sc.onload = () => {
      // @ts-expect-error iFrameResize global
      if (window.iFrameResize) window.iFrameResize({}, "#paytriframe");
    };
    document.body.appendChild(sc);
    return () => { sc.remove(); };
  }, []);
  return (
    <iframe
      id="paytriframe"
      src={`https://www.paytr.com/odeme/guvenli/${token}`}
      frameBorder={0}
      scrolling="no"
      style={{ width: "100%", minHeight: 600 }}
      title="PayTR"
    />
  );
}
```

- [ ] **Step 2: CheckoutForm yaz**

`components/shop/CheckoutForm.tsx`:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "./CartProvider";
import { PaytrFrame } from "./PaytrFrame";
import { startCheckout, type CheckoutState } from "@/app/[locale]/odeme/actions";

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const { items, clear } = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});

  useEffect(() => { if (state.iframeToken) clear(); }, [state.iframeToken, clear]);

  if (state.iframeToken) return <PaytrFrame token={state.iframeToken} />;

  return (
    <form action={action} className="mx-auto flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="lines" value={JSON.stringify(items.map((i) => ({ productId: i.productId, qty: i.qty })))} />
      <input name="name" placeholder={t("name")} required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="phone" placeholder={t("phone")} inputMode="tel" required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="email" type="email" placeholder={t("email")} required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <div className="flex gap-3">
        <input name="city" placeholder={t("city")} required className="w-1/2 rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        <input name="district" placeholder={t("district")} required className="w-1/2 rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <textarea name="address" placeholder={t("address")} rows={3} required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="postal" placeholder={t("postal")} className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button disabled={pending || items.length === 0} className="btn-gold rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50">
        {pending ? t("processing") : t("pay")}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Ödeme sayfasını yaz**

`app/[locale]/odeme/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { isCargoEnabled } from "@/lib/cargo-catalog";

export default async function OdemePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isCargoEnabled())) notFound();
  const t = await getTranslations("checkout");
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 text-center font-serif text-3xl text-gold-gradient">{t("title")}</h1>
      <CheckoutForm />
    </section>
  );
}
```

- [ ] **Step 4: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully", `/[locale]/odeme` listelenir.

- [ ] **Step 5: Commit**

```bash
git add components/shop/CheckoutForm.tsx components/shop/PaytrFrame.tsx app/[locale]/odeme/page.tsx
git commit -m "feat(shop): ödeme sayfası — adres formu + PayTR iFrame"
```

---

## Task 12: Ödeme sonuç sayfası (`/odeme/sonuc`)

**Files:**
- Create: `app/[locale]/odeme/sonuc/page.tsx`

- [ ] **Step 1: Sonuç sayfasını yaz**

`app/[locale]/odeme/sonuc/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function SonucPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { locale } = await params;
  const { d } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const ok = d === "ok";
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className={`font-serif text-3xl ${ok ? "text-gold-gradient" : "text-red-400"}`}>
        {ok ? t("successTitle") : t("failTitle")}
      </h1>
      <p className="mt-4 text-cream/70">{ok ? t("successBody") : t("failBody")}</p>
      <Link href="/magaza" className="btn-gold mt-8 inline-block rounded-full px-6 py-3 text-sm font-semibold">
        {t("title")}
      </Link>
    </section>
  );
}
```

> Not: Bu sayfa yalnız müşteriye bilgi verir; siparişi **paid** yapmaz (onu webhook yapar).

- [ ] **Step 2: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully".

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/odeme/sonuc
git commit -m "feat(shop): ödeme sonuç sayfası (bilgilendirme)"
```

---

## Task 13: PayTR callback webhook (`/api/paytr/callback`)

**Files:**
- Create: `app/api/paytr/callback/route.ts`

- [ ] **Step 1: Route handler yaz**

`app/api/paytr/callback/route.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { verifyCallback } from "@/lib/paytr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = process.env.PAYTR_MERCHANT_KEY;
  const salt = process.env.PAYTR_MERCHANT_SALT;
  if (!key || !salt) return new Response("PAYTR not configured", { status: 500 });

  const form = await req.formData();
  const post = {
    merchant_oid: String(form.get("merchant_oid") ?? ""),
    status: String(form.get("status") ?? ""),
    total_amount: String(form.get("total_amount") ?? ""),
    hash: String(form.get("hash") ?? ""),
  };

  if (!verifyCallback(post, key, salt)) return new Response("BAD HASH", { status: 400 });

  const order = await prisma.shopOrder.findUnique({
    where: { merchantOid: post.merchant_oid },
    include: { items: true },
  });
  // Sipariş yoksa bile PayTR'a OK dön (tekrar denemesin)
  if (!order) return new Response("OK");
  // Idempotent: zaten işlenmişse tekrar düşme
  if (order.status !== "pending_payment") return new Response("OK");

  if (post.status === "success") {
    await prisma.$transaction(async (tx) => {
      await tx.shopOrder.update({
        where: { id: order.id },
        data: { status: "paid", paytrStatus: post.status, paidAt: new Date() },
      });
      // Takipli ürünlerde stok düş (negatife düşürmeden)
      for (const it of order.items) {
        if (!it.productId) continue;
        await tx.product.updateMany({
          where: { id: it.productId, cargoStock: { gte: it.qty } },
          data: { cargoStock: { decrement: it.qty } },
        });
      }
    });
  } else {
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { status: "cancelled", paytrStatus: post.status },
    });
  }

  return new Response("OK");
}
```

> PayTR yalnız gövde `OK` görürse bildirimi tamamlanmış sayar. Hash doğrulanmadan asla paid yapılmaz. `cargoStock` `null` (takipsiz) ürünlerde `updateMany` koşulu eşleşmez → düşmez (doğru davranış).

- [ ] **Step 2: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully", `/api/paytr/callback` listelenir.

- [ ] **Step 3: Commit**

```bash
git add app/api/paytr/callback
git commit -m "feat(shop): PayTR callback webhook (hash doğrulama + idempotent paid + stok düşümü)"
```

---

## Task 14: ProductForm — cargoAvailable + cargoStock

**Files:**
- Modify: `components/admin/ProductForm.tsx`
- Modify: `app/[locale]/admin/urunler/actions.ts`
- Modify: `app/[locale]/admin/urunler/[id]/page.tsx`

- [ ] **Step 1: ProductData tipine alanları ekle**

`components/admin/ProductForm.tsx` içindeki `ProductData` tipine ekle:

```ts
  cargoAvailable?: boolean;
  cargoStock?: number | null;
```

- [ ] **Step 2: Forma kargo bölümünü ekle**

`components/admin/ProductForm.tsx` içinde "Porsiyonlar" `gold-divider` bloğundan ÖNCE ekle:

```tsx
      <div className="gold-divider my-1" />
      <h2 className="font-serif text-gold">Kargo Mağazası</h2>
      <label className="flex items-center gap-2 text-sm text-cream/80">
        <input type="checkbox" name="cargoAvailable" defaultChecked={product?.cargoAvailable} />
        Bu ürün kargoyla satılsın (/magaza)
      </label>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Kargo stoğu (boş = sınırsız)</label>
        <input name="cargoStock" type="number" min="0" step="1" inputMode="numeric"
          defaultValue={product?.cargoStock ?? ""} placeholder="örn. 50"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <p className="text-xs text-cream/50">Kargo fiyatı = yukarıdaki ₺ fiyatıdır. Stok 0 olunca mağazada &quot;Tükendi&quot; görünür.</p>
```

- [ ] **Step 3: actions.ts — create & update'e alanları ekle**

`app/[locale]/admin/urunler/actions.ts` içinde `parsePrice` yanına ekle:

```ts
function parseStock(form: FormData): number | null {
  const raw = ((form.get("cargoStock") as string) ?? "").trim();
  if (!raw) return null;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
```

Hem `createProduct` hem `updateProduct` içindeki `data: { ... }` nesnesine (reels satırından önce) ekle:

```ts
      cargoAvailable: formData.get("cargoAvailable") === "on",
      cargoStock: parseStock(formData),
```

- [ ] **Step 4: [id]/page.tsx — alanları forma geç**

`app/[locale]/admin/urunler/[id]/page.tsx` içindeki `product={{ ... }}` nesnesine ekle:

```tsx
          cargoAvailable: product.cargoAvailable,
          cargoStock: product.cargoStock,
```

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully".

- [ ] **Step 6: Commit**

```bash
git add components/admin/ProductForm.tsx "app/[locale]/admin/urunler/actions.ts" "app/[locale]/admin/urunler/[id]/page.tsx"
git commit -m "feat(admin): üründe kargo işareti + stok alanı"
```

---

## Task 15: Ayarlar — kargo bölümü

**Files:**
- Modify: `app/[locale]/admin/ayarlar/actions.ts`
- Modify: `app/[locale]/admin/ayarlar/page.tsx`

- [ ] **Step 1: actions.ts — kargo alanlarını oku/yaz**

`app/[locale]/admin/ayarlar/actions.ts` içinde `updateSettings` fonksiyonunda, upsert'e gönderilen `data` nesnesine ekle (mevcut alan okuma desenini izleyerek):

```ts
    cargoEnabled: formData.get("cargoEnabled") === "on",
    shippingFee: (() => { const r = ((formData.get("shippingFee") as string) ?? "").trim().replace(",", "."); const n = Number(r); return r && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; })(),
    freeShippingThreshold: (() => { const r = ((formData.get("freeShippingThreshold") as string) ?? "").trim().replace(",", "."); const n = Number(r); return r && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; })(),
```

(Eğer dosyada hâlihazırda fiyat/sayı ayrıştıran bir yardımcı varsa onu kullan; yoksa yukarıdaki satır içi ifadeler yeterli.)

- [ ] **Step 2: page.tsx — kargo formu alanları**

`app/[locale]/admin/ayarlar/page.tsx` içinde mevcut ayarlar formuna yeni bir bölüm ekle (mevcut input deseniyle, `defaultValue` settings'ten):

```tsx
      <div className="gold-divider my-2" />
      <h2 className="font-serif text-gold">Kargo Mağazası</h2>
      <label className="flex items-center gap-2 text-sm text-cream/80">
        <input type="checkbox" name="cargoEnabled" defaultChecked={settings?.cargoEnabled ?? false} />
        Kargo mağazasını aç (/magaza, sepet, ödeme)
      </label>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Sabit kargo ücreti (₺)</label>
        <input name="shippingFee" type="number" step="0.01" min="0" defaultValue={settings?.shippingFee != null ? Number(settings.shippingFee) : ""} placeholder="99.90"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Ücretsiz kargo eşiği (₺, boş = yok)</label>
        <input name="freeShippingThreshold" type="number" step="0.01" min="0" defaultValue={settings?.freeShippingThreshold != null ? Number(settings.freeShippingThreshold) : ""} placeholder="500"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
```

(`settings` değişkeni sayfada zaten mevcut; değilse `getSiteSettings()` ile al.)

- [ ] **Step 3: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/admin/ayarlar/actions.ts" "app/[locale]/admin/ayarlar/page.tsx"
git commit -m "feat(admin): ayarlarda kargo (aç/kapa, ücret, bedava eşiği)"
```

---

## Task 16: Admin Kargo Siparişleri sayfası + WhatsApp gönder

**Files:**
- Create: `app/[locale]/admin/kargo-siparisler/page.tsx`, `app/[locale]/admin/kargo-siparisler/actions.ts`, `components/admin/ShipForm.tsx`
- Modify: `app/[locale]/admin/layout.tsx`

- [ ] **Step 1: actions.ts yaz**

`app/[locale]/admin/kargo-siparisler/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { markShopOrderShipped } from "@/lib/shop";
import { prisma } from "@/lib/prisma";

const s = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function shipOrder(formData: FormData) {
  await requireHQ();
  const id = s(formData.get("id"), 64);
  const trackingNo = s(formData.get("trackingNo"), 80);
  const carrier = s(formData.get("carrier"), 40);
  if (!id || !trackingNo || !carrier) return;
  await markShopOrderShipped(id, trackingNo, carrier);
  revalidatePath("/admin/kargo-siparisler");
}

export async function markDelivered(formData: FormData) {
  await requireHQ();
  const id = s(formData.get("id"), 64);
  if (!id) return;
  await prisma.shopOrder.update({ where: { id }, data: { status: "delivered" } });
  revalidatePath("/admin/kargo-siparisler");
}
```

- [ ] **Step 2: ShipForm (client) yaz**

`components/admin/ShipForm.tsx`:

```tsx
"use client";

import { buildCargoMessage, CARRIERS } from "@/lib/cargo-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { shipOrder } from "@/app/[locale]/admin/kargo-siparisler/actions";

type Props = {
  id: string; phone: string; customerName: string;
  trackingNo: string | null; carrier: string | null; status: string;
};

export function ShipForm({ id, phone, customerName, trackingNo, carrier, status }: Props) {
  function sendWhatsapp() {
    if (!trackingNo || !carrier) return;
    const msg = buildCargoMessage({ customerName, trackingNo, carrier, locale: "tr" });
    window.open(buildWhatsAppHref(phone, msg), "_blank", "noopener,noreferrer");
  }
  return (
    <div className="flex flex-col gap-2">
      <form action={shipOrder} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <select name="carrier" defaultValue={carrier ?? ""} className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
          <option value="">Firma…</option>
          {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="trackingNo" defaultValue={trackingNo ?? ""} placeholder="Takip No"
          className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
        <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Kaydet & Kargolandı</button>
      </form>
      {trackingNo && carrier && (
        <button type="button" onClick={sendWhatsapp}
          className="self-start rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">
          Müşteriye WhatsApp Gönder
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: page.tsx yaz**

`app/[locale]/admin/kargo-siparisler/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { requireHQ } from "@/lib/require-admin";
import { getShopOrders } from "@/lib/shop";
import { formatPrice } from "@/lib/price";
import { ShipForm } from "@/components/admin/ShipForm";
import { markDelivered } from "./actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Ödeme bekliyor", cls: "text-cream/50" },
  paid: { label: "Ödendi", cls: "text-gold" },
  shipped: { label: "Kargolandı", cls: "text-pistachio" },
  delivered: { label: "Teslim edildi", cls: "text-green-400" },
  cancelled: { label: "İptal", cls: "text-red-400" },
};

export default async function KargoSiparislerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const orders = (await getShopOrders()).filter((o) => o.status !== "pending_payment" && o.status !== "cancelled");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Kargo Siparişleri ({orders.length})</h1>
      <ul className="flex flex-col gap-3">
        {orders.map((o) => (
          <li key={o.id} className="card-premium flex flex-col gap-3 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-cream">
                {o.customerName} · {o.customerPhone}
                <span className={`ml-2 text-xs ${STATUS[o.status]?.cls}`}>● {STATUS[o.status]?.label ?? o.status}</span>
              </p>
              <span className="font-serif text-gold">{formatPrice(Number(o.total), "TRY")}</span>
            </div>
            <p className="text-sm text-cream/70">{o.addressFull} — {o.addressDistrict}/{o.addressCity} {o.addressPostal ?? ""}</p>
            <ul className="text-sm text-cream/60">
              {o.items.map((it) => <li key={it.id}>• {it.title} × {it.qty} — {formatPrice(Number(it.lineTotal), "TRY")}</li>)}
            </ul>
            <p className="text-xs text-cream/40">{new Date(o.createdAt).toLocaleString("tr-TR")} · {o.customerEmail}</p>
            <ShipForm id={o.id} phone={o.customerPhone} customerName={o.customerName}
              trackingNo={o.trackingNo} carrier={o.carrier} status={o.status} />
            {o.status === "shipped" && (
              <form action={markDelivered}>
                <input type="hidden" name="id" value={o.id} />
                <button className="text-sm text-green-400">Teslim Edildi İşaretle</button>
              </form>
            )}
          </li>
        ))}
        {orders.length === 0 && <p className="text-cream/60">Henüz kargo siparişi yok.</p>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Sidebar'a link ekle**

`app/[locale]/admin/layout.tsx` içindeki HQ bloğunda (`<Link href="/admin/siparisler">` benzeri) ekle:

```tsx
            <Link href="/admin/kargo-siparisler">Kargo Siparişleri</Link>
```

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: "Compiled successfully", `/[locale]/admin/kargo-siparisler` listelenir.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/admin/kargo-siparisler" components/admin/ShipForm.tsx "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): Kargo Siparişleri sayfası + takip no + WhatsApp gönder"
```

---

## Task 17: Tam doğrulama + deploy

**Files:** (yok — doğrulama)

- [ ] **Step 1: Tüm testler**

Run: `npx vitest run`
Expected: PASS (paytr, shipping, cart, cargo-message + mevcutlar).

- [ ] **Step 2: Tip + temiz build**

Run: `npx tsc --noEmit && rm -rf .next && npm run build 2>&1 | tail -8`
Expected: "Compiled successfully", tüm yeni rotalar (`/magaza`, `/sepet`, `/odeme`, `/odeme/sonuc`, `/api/paytr/callback`, `/admin/kargo-siparisler`) listelenir, `node:util/types` hatası YOK.

- [ ] **Step 3: Push (deploy tetikler)**

```bash
git push origin main
```

- [ ] **Step 4: Vercel deploy durumunu doğrula**

Run: `curl -s "https://api.github.com/repos/ysf-dnz/kunefe-house/commits/$(git rev-parse HEAD)/status" | grep -m1 '"state"'`
Expected: birkaç dakika sonra `"state": "success"`.

- [ ] **Step 5: Kullanıcıya kalan adımları bildir**
  - Vercel → Environment Variables (Production): `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT` ekle (+ test için `PAYTR_TEST_MODE=1`).
  - PayTR mağaza paneli → **Bildirim URL'si**: `https://kunefehouse.com/api/paytr/callback`.
  - Admin → Site Ayarları → "Kargo mağazasını aç" işaretle, kargo ücreti + bedava eşiği gir.
  - En az bir ürünü "kargoyla satılsın" işaretle + stok gir.
  - Test modunda PayTR test kartıyla uçtan uca dene; ardından `PAYTR_TEST_MODE` kaldır.

---

## Self-Review Notları
- **Spec kapsamı:** ayrı /magaza (T8), sepet (T3,T7,T9), PayTR iFrame (T4,T10,T11), webhook+idempotent+stok (T13), WhatsApp takip (T5,T16), basit stok (T1,T13,T14), kargo ücreti (T2,T15), HQ-only admin (T16), TRY-only (her yerde "TRY"/"TL"), güvenlik: sunucu fiyat (T10), hash doğrulama (T4,T13), rate-limit (T10), Node runtime callback (T13). Tümü karşılandı.
- **Tip tutarlılığı:** `CartItem` (lib/cart) tüm sepet bileşenlerinde; `ShippingConfig`/`calcShipping` (T2) CartView+shop'ta; `paytrToken`/`encodeBasket`/`toKurus`/`verifyCallback` (T4) action+webhook'ta; `createShopOrder`/`getShopOrders`/`markShopOrderShipped` (T10) action+admin'de; `CARRIERS`/`buildCargoMessage` (T5) ShipForm'da. Adlar tutarlı.
- **Placeholder yok:** tüm kod blokları tam.
