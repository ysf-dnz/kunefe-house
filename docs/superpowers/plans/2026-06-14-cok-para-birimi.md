# Çoklu Para Birimi + Ürün Reels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Her ürün/porsiyona ₺/$/ر.ق ayrı fiyat; aktif dile göre para birimi gösterilir (TR→TRY, EN→USD, AR→QAR), o dilin fiyatı girilmemişse fiyat gizlenir. Ayrıca ürün sayfası altına reels şeridi. (Header titreşme fix'i zaten uygulandı.)

**Architecture:** Additive şema (Product'a 4 fiyat alanı + Order.currency). Saf yardımcılar `lib/portions.ts` (genişletilir), `lib/currency.ts` (yeni), `lib/price.ts` (formatPrice imzası) Vitest TDD. Aktif dilin para birimi/fiyatı tek kaynaktan (`currency.ts`) seçilir; eksikse null → gizlenir. Admin form + public gösterim + sipariş/ETA mesajları para-birimi farkında.

**Tech Stack:** Next.js 16.2, React 19, Prisma 7.8 + Supabase, next-intl TR/EN/AR, framer-motion, Vitest.

---

## File Structure

**Yeni:** `lib/currency.ts` + `tests/unit/currency.test.ts`.
**Değişecek:** `prisma/schema.prisma`, `lib/portions.ts` (+test), `lib/price.ts` (+test), `components/admin/PortionEditor.tsx`, `components/admin/ProductForm.tsx`, `app/[locale]/admin/urunler/actions.ts`, `app/[locale]/admin/urunler/[id]/page.tsx`, `components/public/ProductCard.tsx`, `components/public/OrderFlow.tsx`, `app/[locale]/lezzetlerimiz/page.tsx` (+reels), `app/[locale]/lezzetlerimiz/[slug]/page.tsx`, `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`, `app/[locale]/admin/siparisler/page.tsx`, `lib/orders.ts`.

---

## Task 1: Şema + Migration

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Product'a para birimi alanları ekle**

`Product` modelinde `oldPrice         Decimal?         @db.Decimal(10, 2)` satırının altına ekle:
```prisma
  priceUsd          Decimal?         @db.Decimal(10, 2)
  oldPriceUsd       Decimal?         @db.Decimal(10, 2)
  priceQar          Decimal?         @db.Decimal(10, 2)
  oldPriceQar       Decimal?         @db.Decimal(10, 2)
```

- [ ] **Step 2: Order'a currency ekle**

`Order` modelinde `price         Decimal? @db.Decimal(10, 2)` satırının altına ekle:
```prisma
  currency      String   @default("TRY")
```

- [ ] **Step 3: Migration**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name multi_currency`
Expected: "Applying migration ...multi_currency" + "✔ Generated Prisma Client". (P1001 → 3 kez dene; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 4: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): Product USD/QAR fiyat alanları + Order.currency"
```

---

## Task 2: `lib/portions.ts` — Portion tipini genişlet (TDD)

**Files:** Modify `lib/portions.ts`, `tests/unit/portions.test.ts`

- [ ] **Step 1: Teste yeni alan senaryosu ekle**

`tests/unit/portions.test.ts` içine, mevcut `describe("parsePortions"...)` bloğunun İÇİNE yeni bir `it` ekle:
```ts
  it("usd/qar ve eski değerlerini ayrıştırır", () => {
    const raw = JSON.stringify([
      { persons: 4, price: 320, oldPrice: 380, usd: 10, oldUsd: 12, qar: 36, oldQar: 40 },
    ]);
    expect(parsePortions(raw)).toEqual([
      { persons: 4, price: 320, oldPrice: 380, usd: 10, oldUsd: 12, qar: 36, oldQar: 40 },
    ]);
  });
  it("eksik usd/qar alanlarını yok sayar (geriye uyum)", () => {
    const raw = JSON.stringify([{ persons: 2, price: 180 }]);
    expect(parsePortions(raw)).toEqual([{ persons: 2, price: 180 }]);
  });
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/portions.test.ts`
Expected: FAIL (yeni alanlar parse edilmiyor).

- [ ] **Step 3: `lib/portions.ts` güncelle**

`Portion` tipini değiştir:
```ts
export type Portion = {
  persons: number;
  price: number;        // TRY
  oldPrice?: number;
  usd?: number; oldUsd?: number;
  qar?: number; oldQar?: number;
};
```

`parsePortions` içinde, `out.push(portion);` satırından ÖNCE (oldPrice bloğundan sonra) ekle:
```ts
    // Para birimi alanları (USD/QAR) — opsiyonel, pozitif; eski > yeni değilse atılır
    const addCur = (key: "usd" | "qar", oldKey: "oldUsd" | "oldQar", rawKey: string, rawOldKey: string) => {
      const v = Number(r[rawKey]);
      if (Number.isFinite(v) && v >= 0) {
        portion[key] = Math.round(v * 100) / 100;
        const ov = Number(r[rawOldKey]);
        if (Number.isFinite(ov) && ov > v) portion[oldKey] = Math.round(ov * 100) / 100;
      }
    };
    addCur("usd", "oldUsd", "usd", "oldUsd");
    addCur("qar", "oldQar", "qar", "oldQar");
```

- [ ] **Step 4: Pass doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/portions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/portions.ts tests/unit/portions.test.ts
git commit -m "feat: Portion tipine USD/QAR fiyat alanları"
```

---

## Task 3: `lib/currency.ts` — para birimi seçimi (TDD)

**Files:** Create `lib/currency.ts`, `tests/unit/currency.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/currency.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { currencyForLocale, productPriceForLocale, portionPriceForLocale, minPortionPriceForLocale } from "@/lib/currency";

const prod = {
  price: 320, oldPrice: 380,
  priceUsd: 10, oldPriceUsd: 12,
  priceQar: null, oldPriceQar: null,
};

describe("currencyForLocale", () => {
  it("dile göre para birimi kodu", () => {
    expect(currencyForLocale("tr")).toBe("TRY");
    expect(currencyForLocale("en")).toBe("USD");
    expect(currencyForLocale("ar")).toBe("QAR");
  });
});

describe("productPriceForLocale", () => {
  it("tr → TRY fiyatı", () => { expect(productPriceForLocale(prod, "tr")).toEqual({ price: 320, oldPrice: 380 }); });
  it("en → USD fiyatı", () => { expect(productPriceForLocale(prod, "en")).toEqual({ price: 10, oldPrice: 12 }); });
  it("ar → boşsa null", () => { expect(productPriceForLocale(prod, "ar")).toEqual({ price: null, oldPrice: null }); });
});

describe("portionPriceForLocale", () => {
  const p = { persons: 4, price: 320, oldPrice: 380, usd: 10, qar: 36 };
  it("en → usd", () => { expect(portionPriceForLocale(p, "en")).toEqual({ price: 10, oldPrice: null }); });
  it("ar → qar", () => { expect(portionPriceForLocale(p, "ar")).toEqual({ price: 36, oldPrice: null }); });
  it("tr → price", () => { expect(portionPriceForLocale(p, "tr")).toEqual({ price: 320, oldPrice: 380 }); });
});

describe("minPortionPriceForLocale", () => {
  it("aktif para biriminde en düşük dolu fiyat", () => {
    const ps = [{ persons: 2, price: 180, usd: 6 }, { persons: 4, price: 320, usd: 10 }];
    expect(minPortionPriceForLocale(ps, "en")).toBe(6);
    expect(minPortionPriceForLocale(ps, "tr")).toBe(180);
  });
  it("o para biriminde hiç fiyat yoksa null", () => {
    const ps = [{ persons: 2, price: 180 }];
    expect(minPortionPriceForLocale(ps, "en")).toBeNull();
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/currency.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `lib/currency.ts` yaz**

```ts
import type { Locale } from "./i18n-field";
import type { Portion } from "./portions";

export type CurrencyCode = "TRY" | "USD" | "QAR";

export function currencyForLocale(locale: Locale): CurrencyCode {
  return locale === "en" ? "USD" : locale === "ar" ? "QAR" : "TRY";
}

type ProductPrices = {
  price?: number | null; oldPrice?: number | null;
  priceUsd?: number | null; oldPriceUsd?: number | null;
  priceQar?: number | null; oldPriceQar?: number | null;
};

export function productPriceForLocale(p: ProductPrices, locale: Locale): { price: number | null; oldPrice: number | null } {
  const c = currencyForLocale(locale);
  if (c === "USD") return { price: p.priceUsd ?? null, oldPrice: p.oldPriceUsd ?? null };
  if (c === "QAR") return { price: p.priceQar ?? null, oldPrice: p.oldPriceQar ?? null };
  return { price: p.price ?? null, oldPrice: p.oldPrice ?? null };
}

export function portionPriceForLocale(portion: Portion, locale: Locale): { price: number | null; oldPrice: number | null } {
  const c = currencyForLocale(locale);
  if (c === "USD") return { price: portion.usd ?? null, oldPrice: portion.oldUsd ?? null };
  if (c === "QAR") return { price: portion.qar ?? null, oldPrice: portion.oldQar ?? null };
  return { price: portion.price ?? null, oldPrice: portion.oldPrice ?? null };
}

export function minPortionPriceForLocale(portions: Portion[], locale: Locale): number | null {
  const vals = portions
    .map((p) => portionPriceForLocale(p, locale).price)
    .filter((v): v is number => v != null);
  return vals.length ? Math.min(...vals) : null;
}
```

- [ ] **Step 4: Pass doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/currency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/currency.ts tests/unit/currency.test.ts
git commit -m "feat: lib/currency — dile göre para birimi + aktif fiyat seçimi"
```

---

## Task 4: `lib/price.ts` formatPrice imzası + çağıranlar (TDD)

**Files:** Modify `lib/price.ts`, `tests/unit/` (yeni test), ve formatPrice çağıran dosyalar

- [ ] **Step 1: Test ekle**

`tests/unit/price.test.ts` (yoksa oluştur, varsa ekle):
```ts
import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/price";

describe("formatPrice", () => {
  it("para birimi koduna göre sembol kullanır", () => {
    expect(formatPrice(320, "TRY")).toContain("₺");
    expect(formatPrice(10, "USD")).toContain("$");
    expect(formatPrice(36, "QAR", "ar")).toMatch(/ر\.?ق|QAR/);
  });
  it("null → null", () => { expect(formatPrice(null, "USD")).toBeNull(); });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/price.test.ts`
Expected: FAIL (imza uyumsuz / sembol yanlış).

- [ ] **Step 3: `lib/price.ts` formatPrice'ı değiştir**

`formatPrice` fonksiyonunu şununla değiştir:
```ts
import type { CurrencyCode } from "./currency";

const CURRENCY_LOCALE: Record<CurrencyCode, string> = { TRY: "tr-TR", USD: "en-US", QAR: "ar-QA" };

/** 149.9, "USD" -> "$149.90" (para birimi koduna göre sembol). */
export function formatPrice(value: number | null, currency: CurrencyCode = "TRY", locale?: Locale): string | null {
  if (value === null) return null;
  const displayLocale = locale ? (LOCALE_MAP[locale] ?? "tr-TR") : CURRENCY_LOCALE[currency];
  return new Intl.NumberFormat(displayLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
```
(Dosya başındaki `import type { Locale }` kalır; `LOCALE_MAP` kalır.)

- [ ] **Step 4: Çağıranları geçici olarak "TRY" ile uyumla**

Bu adımda yalnız derlemeyi yeşil tutmak için mevcut çağıranları güncelle (gerçek para birimi sonraki task'larda gelir). Şu dosyalarda `formatPrice(X, loc)` / `formatPrice(X, locale)` / `formatPrice(X, "tr")` çağrılarını bul ve **ikinci argümanı para birimine** çevir:
- `components/public/ProductCard.tsx`: tüm `formatPrice(x, locale)` → `formatPrice(x, "TRY")` (Task 7'de düzeltilecek)
- `components/public/OrderFlow.tsx`: `formatPrice(x, locale)` → `formatPrice(x, "TRY")` (Task 8'de düzeltilecek)
- `app/[locale]/admin/siparisler/page.tsx`: `formatPrice(price, "tr")` → `formatPrice(price, "TRY")` (Task 9'da düzeltilecek)

> Not: Bu geçici uyumlama tsc'yi yeşil tutar; davranış (₺) öncekiyle aynı kalır.

- [ ] **Step 5: Pass + tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/price.test.ts && npx tsc --noEmit`
Expected: testler PASS, tsc Exit 0.

- [ ] **Step 6: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/price.ts tests/unit/price.test.ts components/public/ProductCard.tsx components/public/OrderFlow.tsx "app/[locale]/admin/siparisler/page.tsx"
git commit -m "feat: formatPrice para birimi koduyla (çağıranlar geçici TRY)"
```

---

## Task 5: PortionEditor — USD/QAR sütunları

**Files:** Modify `components/admin/PortionEditor.tsx`

- [ ] **Step 1: Editörü genişlet**

`components/admin/PortionEditor.tsx` tamamını şununla değiştir:
```tsx
"use client";

import { useState } from "react";
import type { Portion } from "@/lib/portions";

type Row = {
  persons: string; price: string; oldPrice: string;
  usd: string; oldUsd: string; qar: string; oldQar: string;
};

function toRows(portions: Portion[] | null | undefined): Row[] {
  if (!portions || portions.length === 0) return [];
  return portions.map((p) => ({
    persons: String(p.persons),
    price: String(p.price),
    oldPrice: p.oldPrice != null ? String(p.oldPrice) : "",
    usd: p.usd != null ? String(p.usd) : "",
    oldUsd: p.oldUsd != null ? String(p.oldUsd) : "",
    qar: p.qar != null ? String(p.qar) : "",
    oldQar: p.oldQar != null ? String(p.oldQar) : "",
  }));
}

const num = (s: string) => (s.trim() ? Number(s) : undefined);

export function PortionEditor({ name, defaultValue }: { name: string; defaultValue?: Portion[] | null }) {
  const [rows, setRows] = useState<Row[]>(toRows(defaultValue));

  function update(i: number, key: keyof Row, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { persons: "", price: "", oldPrice: "", usd: "", oldUsd: "", qar: "", oldQar: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  const serialized = JSON.stringify(
    rows
      .map((r) => ({
        persons: Number(r.persons),
        price: Number(r.price),
        ...(r.oldPrice.trim() ? { oldPrice: Number(r.oldPrice) } : {}),
        ...(num(r.usd) !== undefined ? { usd: num(r.usd) } : {}),
        ...(num(r.oldUsd) !== undefined ? { oldUsd: num(r.oldUsd) } : {}),
        ...(num(r.qar) !== undefined ? { qar: num(r.qar) } : {}),
        ...(num(r.oldQar) !== undefined ? { oldQar: num(r.oldQar) } : {}),
      }))
      .filter((p) => Number.isFinite(p.persons) && p.persons > 0 && Number.isFinite(p.price))
  );

  const cell = "rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream";

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={serialized} />
      <span className="text-xs text-cream/50">
        Her porsiyona ₺ (zorunlu) + opsiyonel $ ve ر.ق fiyatı gir. Bir para birimi boşsa o dilde fiyat gösterilmez.
      </span>
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-copper/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <label className="text-xs text-cream/70">Kişi</label>
            <input type="number" min="1" value={r.persons} onChange={(e) => update(i, "persons", e.target.value)}
              className={`${cell} w-20`} placeholder="4" />
            <button type="button" onClick={() => removeRow(i)}
              className="ms-auto rounded border border-red-400/50 px-3 py-1 text-xs text-red-400 hover:bg-red-400/10">Sil</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-cream/70">₺ fiyat
              <input type="number" min="0" step="0.01" value={r.price} onChange={(e) => update(i, "price", e.target.value)} className={cell} placeholder="320" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/70">$ fiyat
              <input type="number" min="0" step="0.01" value={r.usd} onChange={(e) => update(i, "usd", e.target.value)} className={cell} placeholder="10" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/70">ر.ق fiyat
              <input type="number" min="0" step="0.01" value={r.qar} onChange={(e) => update(i, "qar", e.target.value)} className={cell} placeholder="36" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/50">₺ eski
              <input type="number" min="0" step="0.01" value={r.oldPrice} onChange={(e) => update(i, "oldPrice", e.target.value)} className={cell} placeholder="380" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/50">$ eski
              <input type="number" min="0" step="0.01" value={r.oldUsd} onChange={(e) => update(i, "oldUsd", e.target.value)} className={cell} placeholder="12" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/50">ر.ق eski
              <input type="number" min="0" step="0.01" value={r.oldQar} onChange={(e) => update(i, "oldQar", e.target.value)} className={cell} placeholder="40" /></label>
          </div>
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="self-start rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold hover:bg-gold/10">+ Porsiyon ekle</button>
    </div>
  );
}
```

- [ ] **Step 2: tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/admin/PortionEditor.tsx
git commit -m "feat(admin): porsiyon editörüne USD/QAR sütunları"
```

---

## Task 6: ProductForm + actions + edit page — USD/QAR alanları

**Files:** Modify `components/admin/ProductForm.tsx`, `app/[locale]/admin/urunler/actions.ts`, `app/[locale]/admin/urunler/[id]/page.tsx`

- [ ] **Step 1: ProductForm tipine + forma alanlar ekle**

`components/admin/ProductForm.tsx` — `ProductData` tipinde `oldPrice?: number | null;` satırının altına ekle:
```tsx
  priceUsd?: number | null; oldPriceUsd?: number | null;
  priceQar?: number | null; oldPriceQar?: number | null;
```

Fiyat bölümünde, mevcut ₺ fiyat/eski-fiyat `grid` bloğunun ardından (porsiyon başlığından önce) ekle:
```tsx
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Fiyat ($)</label>
          <input name="priceUsd" type="number" step="0.01" min="0" defaultValue={product?.priceUsd ?? ""} placeholder="10.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Eski Fiyat ($)</label>
          <input name="oldPriceUsd" type="number" step="0.01" min="0" defaultValue={product?.oldPriceUsd ?? ""} placeholder="12.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Fiyat (ر.ق)</label>
          <input name="priceQar" type="number" step="0.01" min="0" defaultValue={product?.priceQar ?? ""} placeholder="36.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Eski Fiyat (ر.ق)</label>
          <input name="oldPriceQar" type="number" step="0.01" min="0" defaultValue={product?.oldPriceQar ?? ""} placeholder="40.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
      </div>
      <p className="text-xs text-cream/50">$ ve ر.ق boş bırakılırsa o dilde fiyat gösterilmez (₺ Türkçe içindir).</p>
```

- [ ] **Step 2: actions — yeni alanları oku/yaz**

`app/[locale]/admin/urunler/actions.ts` — `createProduct` ve `updateProduct`'ın `data` nesnelerinde, `portions: parsePortions(...)` satırının altına (ikisine de) ekle:
```ts
      priceUsd: parsePrice(formData, "priceUsd"),
      oldPriceUsd: parsePrice(formData, "oldPriceUsd"),
      priceQar: parsePrice(formData, "priceQar"),
      oldPriceQar: parsePrice(formData, "oldPriceQar"),
```

- [ ] **Step 3: edit page — alanları forma geçir**

`app/[locale]/admin/urunler/[id]/page.tsx` — `product={{ ... }}` nesnesinde `portions: (...)` satırının altına ekle:
```tsx
          priceUsd: toNumber(product.priceUsd),
          oldPriceUsd: toNumber(product.oldPriceUsd),
          priceQar: toNumber(product.priceQar),
          oldPriceQar: toNumber(product.oldPriceQar),
```

- [ ] **Step 4: tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/admin/ProductForm.tsx "app/[locale]/admin/urunler/actions.ts" "app/[locale]/admin/urunler/[id]/page.tsx"
git commit -m "feat(admin): üründe USD/QAR fiyat alanları"
```

---

## Task 7: ProductCard — aktif para birimi

**Files:** Modify `components/public/ProductCard.tsx`, `app/[locale]/lezzetlerimiz/page.tsx`

- [ ] **Step 1: ProductCard'ı aktif para birimine çevir**

`components/public/ProductCard.tsx`:

(a) importları güncelle — `minPortionPrice` importunu kaldır, şunları ekle:
```tsx
import { currencyForLocale, productPriceForLocale, minPortionPriceForLocale } from "@/lib/currency";
```

(b) Prop tipine ekle (`portions?: Portion[] | null;` zaten var):
```tsx
  priceUsd?: number | null; oldPriceUsd?: number | null;
  priceQar?: number | null; oldPriceQar?: number | null;
```
ve fonksiyon parametre listesine `priceUsd, oldPriceUsd, priceQar, oldPriceQar` ekle.

(c) Hesaplama bloğunu (mevcut `const portionList = ...; const fromPrice = ...; const priceVisible = ...; const discount = ...;`) şununla değiştir:
```tsx
  const t = useTranslations("order");
  const currency = currencyForLocale(locale);
  const portionList = portions ?? [];
  const single = productPriceForLocale({ price, oldPrice, priceUsd, oldPriceUsd, priceQar, oldPriceQar }, locale);
  const fromPrice = portionList.length > 0 ? minPortionPriceForLocale(portionList, locale) : null;
  const cardPrice = fromPrice != null ? fromPrice : single.price;
  const cardOldPrice = fromPrice != null ? null : single.oldPrice;
  const priceVisible = showPrice && cardPrice != null;
  const discount = priceVisible ? discountPercent(cardPrice, cardOldPrice) : null;
```

(d) Fiyat JSX bloğunda `formatPrice(...)` çağrılarındaki ikinci argümanı `currency` yap ve `t("fromPrice", { price: formatPrice(fromPrice, currency) ?? "" })`; tekil dalda `formatPrice(cardPrice, currency)` ve `formatPrice(cardOldPrice, currency)`.

- [ ] **Step 2: Liste sayfasında kartlara alanları geçir**

`app/[locale]/lezzetlerimiz/page.tsx` — `<ProductCard ... />` çağrısındaki `portions={...}` satırının yanına ekle:
```tsx
              priceUsd={toNumber(p.priceUsd)} oldPriceUsd={toNumber(p.oldPriceUsd)}
              priceQar={toNumber(p.priceQar)} oldPriceQar={toNumber(p.oldPriceQar)}
```

- [ ] **Step 3: tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/public/ProductCard.tsx "app/[locale]/lezzetlerimiz/page.tsx"
git commit -m "feat: ürün kartı aktif para birimi (eksikse gizli)"
```

---

## Task 8: OrderFlow + detay sayfası + order-actions — para birimi

**Files:** Modify `components/public/OrderFlow.tsx`, `app/[locale]/lezzetlerimiz/[slug]/page.tsx`, `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`

- [ ] **Step 1: OrderFlow'u aktif para birimine çevir**

`components/public/OrderFlow.tsx`:

(a) import ekle:
```tsx
import { currencyForLocale, productPriceForLocale, portionPriceForLocale } from "@/lib/currency";
```

(b) `Props` tipine ekle:
```tsx
  singlePriceUsd: number | null; singleOldPriceUsd: number | null;
  singlePriceQar: number | null; singleOldPriceQar: number | null;
```
ve parametre listesine ekle.

(c) Fiyat hesaplama bloğunu para birimine göre yap. Mevcut `const price = ...; const oldPrice = ...;` (porsiyon/tekil seçimi) bloğunu şununla değiştir:
```tsx
  const currency = currencyForLocale(locale);
  const sel = hasPortions
    ? portionPriceForLocale(activePortion!, locale)
    : productPriceForLocale(
        { price: singlePrice, oldPrice: singleOldPrice, priceUsd: singlePriceUsd, oldPriceUsd: singleOldPriceUsd, priceQar: singlePriceQar, oldPriceQar: singleOldPriceQar },
        locale
      );
  const price = sel.price;
  const oldPrice = sel.oldPrice;
```

(d) `priceText` ve tüm `formatPrice(...)` çağrılarında ikinci argümanı `currency` yap:
```tsx
  const priceText = showPrice && price != null ? formatPrice(price, currency) : null;
```
ve fiyat gösterim JSX'inde `formatPrice(oldPrice, currency)`.

- [ ] **Step 2: Detay sayfası — OrderFlow'a alanları geçir**

`app/[locale]/lezzetlerimiz/[slug]/page.tsx` — `<OrderFlow ... singleOldPrice={oldPrice} />` çağrısına ekle:
```tsx
          singlePriceUsd={toNumber(product.priceUsd)}
          singleOldPriceUsd={toNumber(product.oldPriceUsd)}
          singlePriceQar={toNumber(product.priceQar)}
          singleOldPriceQar={toNumber(product.oldPriceQar)}
```

- [ ] **Step 3: order-actions — currency + doğru fiyat kaydı**

`app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`:

(a) importlara ekle:
```ts
import { currencyForLocale, productPriceForLocale, portionPriceForLocale } from "@/lib/currency";
import type { Locale } from "@/lib/i18n-field";
```

(b) `createOrder` formdan `locale` okusun (OrderFlow gönderecek). `productId`/`persons` okunduktan sonra fiyat seçimini para birimine göre yap. Mevcut fiyat-bulma bloğunu (`let price ... product.price`) şununla değiştir:
```ts
    const locale = (clamp(formData.get("locale"), 5) || "tr") as Locale;
    const currency = currencyForLocale(locale);
    let price: number | null = null;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { portions: true, price: true, oldPrice: true, priceUsd: true, oldPriceUsd: true, priceQar: true, oldPriceQar: true },
      });
      if (product) {
        if (persons !== null) {
          const portions = parsePortions(JSON.stringify(product.portions ?? []));
          const match = portions.find((p) => p.persons === persons);
          if (match) price = portionPriceForLocale(match, locale).price;
        }
        if (price == null) {
          price = productPriceForLocale(
            { price: Number(product.price ?? 0) || null, priceUsd: Number(product.priceUsd ?? 0) || null, priceQar: Number(product.priceQar ?? 0) || null },
            locale
          ).price;
        }
      }
    }
```

(c) `prisma.order.create`'in `data`'sına `currency` ekle:
```ts
        price,
        currency,
```

(d) OrderFlow `submit()` içinde FormData'ya locale ekle: `fd.set("locale", locale);`

- [ ] **Step 4: tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/public/OrderFlow.tsx "app/[locale]/lezzetlerimiz/[slug]/page.tsx" "app/[locale]/lezzetlerimiz/[slug]/order-actions.ts"
git commit -m "feat: OrderFlow + sipariş kaydı para birimi farkında"
```

---

## Task 9: Admin Siparişler — para birimiyle göster

**Files:** Modify `app/[locale]/admin/siparisler/page.tsx`

- [ ] **Step 1: currency ile formatla**

`app/[locale]/admin/siparisler/page.tsx` — sipariş satırındaki fiyat gösterimini bul: `price != null ? \` · ${formatPrice(price, "TRY")}\` : ""`. Şununla değiştir:
```tsx
                  {price != null ? ` · ${formatPrice(price, (o.currency as "TRY" | "USD" | "QAR") ?? "TRY")}` : ""}
```

- [ ] **Step 2: tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/siparisler/page.tsx"
git commit -m "feat(admin): siparişte para birimine göre fiyat gösterimi"
```

---

## Task 10: Ürün sayfası altına Reels şeridi

**Files:** Modify `app/[locale]/lezzetlerimiz/page.tsx`

- [ ] **Step 1: Reels ekle**

`app/[locale]/lezzetlerimiz/page.tsx`:

(a) importlara ekle:
```ts
import { getReels } from "@/lib/reels";
import { ReelsStrip } from "@/components/public/ReelsStrip";
```

(b) Mevcut `const [products, categories] = await Promise.all([...])` çağrısına `getReels()` ekle:
```ts
  const [products, categories, reels] = await Promise.all([getProducts(), getCategories(), getReels()]);
```

(c) Sayfanın en sonundaki kapanış `</section>` etiketinden HEMEN SONRA, dönen JSX'i bir fragment'e alıp reels ekle. Yani `return ( <section>...</section> );` yapısını şuna çevir:
```tsx
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20">
        {/* ... mevcut içerik aynen ... */}
      </section>
      {reels.length > 0 && (
        <ReelsStrip
          reels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl, videoUrl: r.videoUrl, instagramUrl: r.instagramUrl }))}
          locale={locale as Locale}
          heading="Mutfaktan Kareler"
        />
      )}
    </>
  );
```
(Mevcut `<section ...>...</section>` içeriğine dokunma; yalnız sarmalayıp altına reels bloğu ekle.)

- [ ] **Step 2: tsc + lint**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit && npx eslint "app/[locale]/lezzetlerimiz/page.tsx"`
Expected: tsc Exit 0; eslint hatasız.

- [ ] **Step 3: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/page.tsx"
git commit -m "feat: ürün sayfası altına reels şeridi"
```

---

## Task 11: Tam doğrulama + build + deploy

**Files:** (yok)

- [ ] **Step 1: Tüm testler**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run`
Expected: Tüm testler PASS (currency/portions/price dahil).

- [ ] **Step 2: tsc + build**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit && npm run build`
Expected: tsc Exit 0; build başarılı.

- [ ] **Step 3: Manuel önizleme**

Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Admin > Ürünler > bir ürün: ₺/$/ر.ق fiyatları + porsiyon para birimleri gir, kaydet.
- TR'de ₺, EN'de $, AR'de ر.ق fiyatı görünür; bir para birimini boş bırakınca o dilde fiyat **gizli**, ürün yine listede.
- Detayda porsiyon seçimi aktif para biriminde fiyatı günceller; "Sipariş Ver" → WhatsApp mesajı o para biriminde.
- Admin > Siparişler: EN siparişinde tutar $ ile.
- Ürün sayfası en altında reels oynar.
- Header: scroll'da titreşme yok (histerezis fix).
- Eski ürün (yalnız ₺): TR'de normal, EN/AR'de fiyat gizli — regresyon yok.

- [ ] **Step 4: Push (deploy)**

```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge stratejisini `finishing-a-development-branch` belirler.)

---

## Self-Review Notları

- **Spec kapsamı:** Model+migration (T1), Portion genişleme (T2), currency.ts seçim (T3), formatPrice para birimi (T4), PortionEditor (T5), ProductForm/actions/edit (T6), ProductCard gizleme (T7), OrderFlow+order kaydı+currency (T8), admin sipariş gösterimi (T9), reels (T10), header doğrulama (T11). Tümü karşılandı.
- **Tip tutarlılığı:** `CurrencyCode` (currency.ts) formatPrice + currencyForLocale + siparisler cast'inde tutarlı. `Portion` usd/oldUsd/qar/oldQar (T2) PortionEditor (T5) + portionPriceForLocale (T3) ile birebir. ProductCard/OrderFlow prop adları (priceUsd/oldPriceUsd/priceQar/oldPriceQar) T6 form alan adları + DB sütunlarıyla aynı.
- **Geriye uyum:** Tüm yeni alanlar nullable; `productPriceForLocale`/`portionPriceForLocale` eksikte null → gizleme. Order.currency default "TRY". formatPrice default "TRY".
- **Decimal/serileştirme:** Tüm Decimal'ler `toNumber` ile client'a geçer; OrderFlow/ProductCard yalnız number alır.
- **Placeholder yok:** Tüm adımlar tam kod / kesin edit talimatı içerir.
