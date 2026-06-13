# Sipariş Akışı (Faz A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürün detay sayfasına porsiyon/kişi seçici + entegre fiyat ekle; "Sipariş Ver" ile GPS konum + adres toplayıp yapılandırılmış WhatsApp mesajı üret; siparişi best-effort DB'ye kaydet ve admin panelde listele.

**Architecture:** Mevcut Next.js 16 App Router + Prisma 7 + next-intl yapısının üzerine *additive* katman. Saf yardımcılar (`lib/portions.ts`, `lib/order-message.ts`) Vitest ile TDD edilir. UI (client component `OrderFlow`, `PortionEditor`) ve server action'lar mevcut desenleri izler; doğrulama `tsc` + `next build` + manuel önizleme ile yapılır. Porsiyon yoksa eski tekil-fiyat davranışı korunur (geriye dönük uyumlu).

**Tech Stack:** Next.js 16.2 (App Router, Server Actions), React 19, Prisma 7.8 (`@prisma/adapter-pg`, Supabase Postgres), next-intl 4.13 (TR/EN/AR), Tailwind v4, Vitest + jsdom.

---

## File Structure

**Yeni dosyalar:**
- `lib/portions.ts` — `Portion` tipi, `parsePortions`, `portionLabel`, `minPortionPrice` (saf, test edilir).
- `lib/order-message.ts` — `buildOrderMessage` WhatsApp metin kurucu + iç i18n etiketleri (saf, test edilir).
- `lib/orders.ts` — admin için `getOrders` (cache'li Prisma okuma).
- `tests/unit/portions.test.ts` — `lib/portions.ts` testleri.
- `tests/unit/order-message.test.ts` — `lib/order-message.ts` testleri.
- `components/admin/PortionEditor.tsx` — porsiyon kademe editörü (client, hidden JSON input).
- `components/public/OrderFlow.tsx` — porsiyon seçici + sipariş kartı + geolocation (client).
- `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts` — `createOrder` public server action (best-effort + güvenlik).
- `app/[locale]/admin/siparisler/page.tsx` — sipariş listesi.
- `app/[locale]/admin/siparisler/actions.ts` — `deleteOrder`, `updateOrderStatus`.

**Değişecek dosyalar:**
- `prisma/schema.prisma` — `Product.portions Json?` + yeni `Order` modeli.
- `components/admin/ProductForm.tsx` — `PortionEditor` dahil + `portions` prop tipi.
- `app/[locale]/admin/urunler/actions.ts` — `create/updateProduct` içinde `portions` oku/doğrula/yaz.
- `app/[locale]/admin/urunler/[id]/page.tsx` — `portions` ProductForm'a geçir.
- `app/[locale]/lezzetlerimiz/[slug]/page.tsx` — statik fiyat bloğunu `OrderFlow` ile değiştir.
- `components/public/ProductCard.tsx` — porsiyon varsa "… ₺'den başlayan" fiyat.
- `app/[locale]/lezzetlerimiz/page.tsx` — karta `portions` geçir.
- `app/[locale]/admin/layout.tsx` — sidebar'a "Siparişler" linki.
- `i18n/messages/{tr,en,ar}.json` — `order` namespace anahtarları.

---

## Task 1: Şema + Migration (Product.portions + Order)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Product modeline `portions` alanı ekle**

`prisma/schema.prisma` içinde `Product` modelinde, `showPrice` satırının hemen altına ekle:

```prisma
  showPrice         Boolean          @default(false)
  portions          Json?            // [{ persons: number, price: number, oldPrice?: number }]
```

- [ ] **Step 2: Order modelini ekle**

`prisma/schema.prisma` sonuna (en alta) yeni model ekle:

```prisma
model Order {
  id            String   @id @default(cuid())
  productId     String?
  product       Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  productTitle  String
  persons       Int?
  price         Decimal? @db.Decimal(10, 2)
  customerName  String?
  customerPhone String?
  addressNote   String?
  note          String?
  locationUrl   String?
  lat           Float?
  lng           Float?
  status        String   @default("new")
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 3: Product modeline ters ilişki ekle**

`Product` modeli içine (ör. `category` satırının altına) ters ilişki ekle (ilişkinin derlenmesi için gerekir):

```prisma
  category          ProductCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  orders            Order[]
```

- [ ] **Step 4: Migration üret ve uygula**

Run: `cd ~/Downloads/kunefe-house && npx prisma migrate dev --name order_and_portions`
Expected: `Applying migration ...order_and_portions` + `✔ Generated Prisma Client`. Migration `prisma/migrations/` altında oluşur.

> Not: P1001 (DB erişilemez) alınırsa bağlantı sağlanınca aynı komut tekrar çalıştırılır. Devam etmeden önce migration'ın uygulandığından emin ol.

- [ ] **Step 5: Commit**

```bash
cd ~/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): Product.portions alanı + Order modeli"
```

---

## Task 2: `lib/portions.ts` — saf yardımcılar (TDD)

**Files:**
- Create: `lib/portions.ts`
- Test: `tests/unit/portions.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/portions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parsePortions, portionLabel, minPortionPrice } from "@/lib/portions";

describe("parsePortions", () => {
  it("geçerli JSON'u kişi sayısına göre artan sıralar", () => {
    const raw = JSON.stringify([
      { persons: 6, price: 450 },
      { persons: 2, price: 180, oldPrice: 220 },
    ]);
    expect(parsePortions(raw)).toEqual([
      { persons: 2, price: 180, oldPrice: 220 },
      { persons: 6, price: 450 },
    ]);
  });
  it("geçersiz/eksik satırları eler", () => {
    const raw = JSON.stringify([
      { persons: 0, price: 100 },      // persons <= 0 → elenir
      { persons: 4, price: -5 },       // price < 0 → elenir
      { persons: 4, price: 320 },      // geçerli
      { persons: 2 },                  // price yok → elenir
    ]);
    expect(parsePortions(raw)).toEqual([{ persons: 4, price: 320 }]);
  });
  it("aynı kişi sayısından yalnız ilkini tutar", () => {
    const raw = JSON.stringify([
      { persons: 4, price: 320 },
      { persons: 4, price: 999 },
    ]);
    expect(parsePortions(raw)).toEqual([{ persons: 4, price: 320 }]);
  });
  it("oldPrice <= price ise oldPrice'ı atar", () => {
    const raw = JSON.stringify([{ persons: 4, price: 320, oldPrice: 300 }]);
    expect(parsePortions(raw)).toEqual([{ persons: 4, price: 320 }]);
  });
  it("boş/null/bozuk girdide boş dizi döner", () => {
    expect(parsePortions("")).toEqual([]);
    expect(parsePortions(null)).toEqual([]);
    expect(parsePortions("değil-json")).toEqual([]);
    expect(parsePortions(JSON.stringify({}))).toEqual([]);
  });
});

describe("portionLabel", () => {
  it("locale'e göre etiket üretir", () => {
    expect(portionLabel(4, "tr")).toBe("4 kişilik");
    expect(portionLabel(4, "en")).toBe("for 4");
    expect(portionLabel(4, "ar")).toBe("لـ 4 أشخاص");
  });
});

describe("minPortionPrice", () => {
  it("en düşük fiyatı döner", () => {
    expect(minPortionPrice([{ persons: 2, price: 180 }, { persons: 6, price: 450 }])).toBe(180);
  });
  it("boş dizide null döner", () => {
    expect(minPortionPrice([])).toBeNull();
  });
});
```

- [ ] **Step 2: Testi çalıştır (fail doğrula)**

Run: `cd ~/Downloads/kunefe-house && npx vitest run tests/unit/portions.test.ts`
Expected: FAIL — `Cannot find module '@/lib/portions'`.

- [ ] **Step 3: `lib/portions.ts` yaz**

```ts
import type { Locale } from "./i18n-field";

export type Portion = { persons: number; price: number; oldPrice?: number };

/** Admin formundan gelen JSON stringi güvenle Portion[]'a çevirir, doğrular, sıralar. */
export function parsePortions(raw: string | null | undefined): Portion[] {
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const seen = new Set<number>();
  const out: Portion[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const persons = Number(r.persons);
    const price = Number(r.price);
    if (!Number.isFinite(persons) || persons <= 0) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    if (seen.has(persons)) continue;
    seen.add(persons);

    const portion: Portion = {
      persons: Math.round(persons),
      price: Math.round(price * 100) / 100,
    };
    const oldPrice = Number(r.oldPrice);
    if (Number.isFinite(oldPrice) && oldPrice > price) {
      portion.oldPrice = Math.round(oldPrice * 100) / 100;
    }
    out.push(portion);
  }
  return out.sort((a, b) => a.persons - b.persons);
}

const LABELS: Record<Locale, (n: number) => string> = {
  tr: (n) => `${n} kişilik`,
  en: (n) => `for ${n}`,
  ar: (n) => `لـ ${n} أشخاص`,
};

export function portionLabel(persons: number, locale: Locale): string {
  return (LABELS[locale] ?? LABELS.tr)(persons);
}

export function minPortionPrice(portions: Portion[]): number | null {
  if (portions.length === 0) return null;
  return Math.min(...portions.map((p) => p.price));
}
```

- [ ] **Step 4: Testi çalıştır (pass doğrula)**

Run: `cd ~/Downloads/kunefe-house && npx vitest run tests/unit/portions.test.ts`
Expected: PASS (tüm testler yeşil).

- [ ] **Step 5: Commit**

```bash
cd ~/Downloads/kunefe-house
git add lib/portions.ts tests/unit/portions.test.ts
git commit -m "feat: porsiyon yardımcıları (parse/label/min) + testler"
```

---

## Task 3: `lib/order-message.ts` — WhatsApp mesaj kurucu (TDD)

**Files:**
- Create: `lib/order-message.ts`
- Test: `tests/unit/order-message.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/order-message.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildOrderMessage } from "@/lib/order-message";

const base = {
  productName: "Fıstıklı Künefe",
  persons: 4,
  priceText: "320 ₺",
  customerName: "Ahmet Yılmaz",
  customerPhone: "05551112233",
  addressNote: "X mah. Y sok. A apt. kat 3 D5",
  note: "Az şerbetli",
  locationUrl: "https://maps.google.com/?q=41.01,28.97",
  locale: "tr" as const,
};

describe("buildOrderMessage", () => {
  it("tüm alanlarla tam mesaj üretir", () => {
    const msg = buildOrderMessage(base);
    expect(msg).toContain("Kunefe House");
    expect(msg).toContain("Fıstıklı Künefe");
    expect(msg).toContain("4 kişilik");
    expect(msg).toContain("320 ₺");
    expect(msg).toContain("Ahmet Yılmaz");
    expect(msg).toContain("05551112233");
    expect(msg).toContain("https://maps.google.com/?q=41.01,28.97");
    expect(msg).toContain("X mah. Y sok. A apt. kat 3 D5");
    expect(msg).toContain("Az şerbetli");
  });

  it("priceText null ise teyit satırı yazar, tutar yazmaz", () => {
    const msg = buildOrderMessage({ ...base, priceText: null });
    expect(msg).toContain("WhatsApp");      // "WhatsApp'tan teyit edilecek"
    expect(msg).not.toContain("320 ₺");
  });

  it("locationUrl yoksa konum satırı atlanır", () => {
    const msg = buildOrderMessage({ ...base, locationUrl: null });
    expect(msg).not.toContain("📍");
  });

  it("note boşsa not satırı atlanır", () => {
    const msg = buildOrderMessage({ ...base, note: "" });
    expect(msg).not.toContain("📝");
  });

  it("İngilizce locale İngilizce etiket kullanır", () => {
    const msg = buildOrderMessage({ ...base, locale: "en" });
    expect(msg).toContain("for 4");
    expect(msg).toContain("Order");
  });
});
```

- [ ] **Step 2: Testi çalıştır (fail doğrula)**

Run: `cd ~/Downloads/kunefe-house && npx vitest run tests/unit/order-message.test.ts`
Expected: FAIL — `Cannot find module '@/lib/order-message'`.

- [ ] **Step 3: `lib/order-message.ts` yaz**

```ts
import type { Locale } from "./i18n-field";
import { portionLabel } from "./portions";

export type OrderMessageInput = {
  productName: string;
  persons: number;
  priceText: string | null; // biçimlendirilmiş tutar (ör. "320 ₺") veya gizliyse null
  customerName: string;
  customerPhone: string;
  addressNote: string;
  note?: string | null;
  locationUrl?: string | null;
  locale: Locale;
};

type Labels = {
  header: string;
  product: string;
  portion: string;
  priceConfirm: string;
  location: string;
  address: string;
  note: string;
  footer: string;
};

const L: Record<Locale, Labels> = {
  tr: {
    header: "🍮 Kunefe House — Sipariş",
    product: "Ürün",
    portion: "Porsiyon",
    priceConfirm: "Fiyat: WhatsApp'tan teyit edilecek",
    location: "Konum",
    address: "Adres",
    note: "Not",
    footer: "Siparişi onaylıyorum.",
  },
  en: {
    header: "🍮 Kunefe House — Order",
    product: "Product",
    portion: "Portion",
    priceConfirm: "Price: to be confirmed on WhatsApp",
    location: "Location",
    address: "Address",
    note: "Note",
    footer: "I confirm the order.",
  },
  ar: {
    header: "🍮 Kunefe House — طلب",
    product: "المنتج",
    portion: "الحصة",
    priceConfirm: "السعر: سيتم تأكيده عبر واتساب",
    location: "الموقع",
    address: "العنوان",
    note: "ملاحظة",
    footer: "أؤكد الطلب.",
  },
};

export function buildOrderMessage(i: OrderMessageInput): string {
  const t = L[i.locale] ?? L.tr;
  const lines: string[] = [];
  lines.push(t.header, "");
  lines.push(`${t.product}: ${i.productName}`);

  const portionText = portionLabel(i.persons, i.locale);
  if (i.priceText) {
    lines.push(`${t.portion}: ${portionText} · ${i.priceText}`);
  } else {
    lines.push(`${t.portion}: ${portionText}`);
    lines.push(t.priceConfirm);
  }
  lines.push("");
  lines.push(`👤 ${i.customerName}`);
  lines.push(`📞 ${i.customerPhone}`);
  if (i.locationUrl) lines.push(`📍 ${t.location}: ${i.locationUrl}`);
  lines.push(`🏠 ${t.address}: ${i.addressNote}`);
  if (i.note && i.note.trim()) lines.push(`📝 ${t.note}: ${i.note.trim()}`);
  lines.push("", t.footer);
  return lines.join("\n");
}
```

- [ ] **Step 4: Testi çalıştır (pass doğrula)**

Run: `cd ~/Downloads/kunefe-house && npx vitest run tests/unit/order-message.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Downloads/kunefe-house
git add lib/order-message.ts tests/unit/order-message.test.ts
git commit -m "feat: WhatsApp sipariş mesajı kurucu + testler"
```

---

## Task 4: i18n `order` namespace anahtarları

**Files:**
- Modify: `i18n/messages/tr.json`, `i18n/messages/en.json`, `i18n/messages/ar.json`

- [ ] **Step 1: tr.json'a `order` ekle**

`i18n/messages/tr.json` içinde `footer` nesnesinden sonra (kök seviyede) ekle:

```json
  "footer": { "rights": "Tüm hakları saklıdır." },
  "order": {
    "selectPortion": "Kaç kişilik?",
    "orderButton": "Sipariş Ver",
    "shareLocation": "Konumumu Paylaş",
    "locationReceived": "Konum alındı ✓",
    "locationFailed": "Konum alınamadı, lütfen adresi yazın",
    "addressNote": "Adres (bina / kat / daire / tarif)",
    "name": "Ad Soyad",
    "phone": "Telefon",
    "extraNote": "Eklemek istedikleriniz (opsiyonel)",
    "send": "WhatsApp'tan Gönder",
    "fromPrice": "{price} ₺'den başlayan",
    "cancel": "Vazgeç",
    "requiredHint": "Ad, telefon ve adres zorunludur."
  }
```

- [ ] **Step 2: en.json'a `order` ekle**

`i18n/messages/en.json` içinde `footer`'dan sonra ekle:

```json
  "order": {
    "selectPortion": "For how many?",
    "orderButton": "Order Now",
    "shareLocation": "Share My Location",
    "locationReceived": "Location received ✓",
    "locationFailed": "Couldn't get location, please type your address",
    "addressNote": "Address (building / floor / flat / directions)",
    "name": "Full Name",
    "phone": "Phone",
    "extraNote": "Anything to add (optional)",
    "send": "Send via WhatsApp",
    "fromPrice": "from {price} ₺",
    "cancel": "Cancel",
    "requiredHint": "Name, phone and address are required."
  }
```

> tr.json'da olduğu gibi `footer` satırının sonuna virgül koymayı unutma.

- [ ] **Step 3: ar.json'a `order` ekle**

`i18n/messages/ar.json` içinde `footer`'dan sonra ekle:

```json
  "order": {
    "selectPortion": "لكم شخص؟",
    "orderButton": "اطلب الآن",
    "shareLocation": "شارك موقعي",
    "locationReceived": "تم تحديد الموقع ✓",
    "locationFailed": "تعذّر تحديد الموقع، يرجى كتابة العنوان",
    "addressNote": "العنوان (المبنى / الطابق / الشقة / وصف)",
    "name": "الاسم الكامل",
    "phone": "الهاتف",
    "extraNote": "أي إضافة (اختياري)",
    "send": "أرسل عبر واتساب",
    "fromPrice": "ابتداءً من {price} ₺",
    "cancel": "إلغاء",
    "requiredHint": "الاسم والهاتف والعنوان مطلوبة."
  }
```

- [ ] **Step 4: JSON geçerliliğini doğrula**

Run: `cd ~/Downloads/kunefe-house && node -e "['tr','en','ar'].forEach(l=>{const m=require('./i18n/messages/'+l+'.json'); if(!m.order?.send) throw new Error(l+' order eksik'); }); console.log('OK')"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
cd ~/Downloads/kunefe-house
git add i18n/messages/tr.json i18n/messages/en.json i18n/messages/ar.json
git commit -m "i18n: sipariş akışı (order) anahtarları TR/EN/AR"
```

---

## Task 5: `PortionEditor` admin bileşeni

**Files:**
- Create: `components/admin/PortionEditor.tsx`

- [ ] **Step 1: Bileşeni yaz**

`components/admin/PortionEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Portion } from "@/lib/portions";

type Row = { persons: string; price: string; oldPrice: string };

function toRows(portions: Portion[] | null | undefined): Row[] {
  if (!portions || portions.length === 0) return [];
  return portions.map((p) => ({
    persons: String(p.persons),
    price: String(p.price),
    oldPrice: p.oldPrice != null ? String(p.oldPrice) : "",
  }));
}

export function PortionEditor({ name, defaultValue }: { name: string; defaultValue?: Portion[] | null }) {
  const [rows, setRows] = useState<Row[]>(toRows(defaultValue));

  function update(i: number, key: keyof Row, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { persons: "", price: "", oldPrice: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  // Hidden input: yalnız sayıya çevrilebilen satırları JSON olarak gönder
  const serialized = JSON.stringify(
    rows
      .map((r) => ({
        persons: Number(r.persons),
        price: Number(r.price),
        ...(r.oldPrice.trim() ? { oldPrice: Number(r.oldPrice) } : {}),
      }))
      .filter((p) => Number.isFinite(p.persons) && p.persons > 0 && Number.isFinite(p.price))
  );

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={serialized} />
      <span className="text-xs text-cream/50">
        Porsiyon eklersen müşteri detayda kişi sayısı seçer; boş bırakırsan yukarıdaki tekil fiyat geçerli olur.
      </span>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-cream/70">
            Kişi
            <input type="number" min="1" value={r.persons} onChange={(e) => update(i, "persons", e.target.value)}
              className="rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" placeholder="4" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream/70">
            Fiyat ₺
            <input type="number" min="0" step="0.01" value={r.price} onChange={(e) => update(i, "price", e.target.value)}
              className="rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" placeholder="320" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream/70">
            Eski ₺ (ops.)
            <input type="number" min="0" step="0.01" value={r.oldPrice} onChange={(e) => update(i, "oldPrice", e.target.value)}
              className="rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" placeholder="380" />
          </label>
          <button type="button" onClick={() => removeRow(i)}
            className="mb-0.5 rounded border border-red-400/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10">
            Sil
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="self-start rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold hover:bg-gold/10">
        + Porsiyon ekle
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0 (hata yok).

- [ ] **Step 3: Commit**

```bash
cd ~/Downloads/kunefe-house
git add components/admin/PortionEditor.tsx
git commit -m "feat(admin): porsiyon kademe editörü bileşeni"
```

---

## Task 6: ProductForm + ürün action entegrasyonu

**Files:**
- Modify: `components/admin/ProductForm.tsx`
- Modify: `app/[locale]/admin/urunler/actions.ts`

- [ ] **Step 1: ProductForm'a porsiyon tipi + editörü ekle**

`components/admin/ProductForm.tsx` — import ekle (dosya başı, diğer importların yanına):

```tsx
import { PortionEditor } from "./PortionEditor";
import type { Portion } from "@/lib/portions";
```

`ProductData` tipine alan ekle (`showPrice?: boolean;` satırının altına):

```tsx
  showPrice?: boolean;
  portions?: Portion[] | null;
```

Fiyat bölümünün sonuna (mevcut `<p className="text-xs text-cream/50">Eski fiyat doluysa...` satırının hemen altına) ekle:

```tsx
      <p className="text-xs text-cream/50">Eski fiyat doluysa üstü çizili gösterilir ve indirim rozeti çıkar. Fiyatı gizlemek için “Fiyatı sitede göster” işaretini kaldırın.</p>

      <div className="gold-divider my-1" />
      <h2 className="font-serif text-gold">Porsiyonlar (kişi sayısına göre fiyat)</h2>
      <PortionEditor name="portions" defaultValue={product?.portions} />
```

- [ ] **Step 2: Ürün action'a porsiyon yazımı ekle**

`app/[locale]/admin/urunler/actions.ts` — import ekle (dosya başı):

```ts
import { parsePortions } from "@/lib/portions";
```

`createProduct` içindeki `data` nesnesinde `showPrice: ...` satırının altına ekle:

```ts
      showPrice: formData.get("showPrice") === "on",
      portions: parsePortions(formData.get("portions") as string),
```

`updateProduct` içindeki `data` nesnesinde de aynı şekilde `showPrice: ...` satırının altına ekle:

```ts
      showPrice: formData.get("showPrice") === "on",
      portions: parsePortions(formData.get("portions") as string),
```

- [ ] **Step 3: Düzenleme sayfasında porsiyonu forma geçir**

`app/[locale]/admin/urunler/[id]/page.tsx` — import ekle:

```ts
import type { Portion } from "@/lib/portions";
```

`product={{ ... }}` nesnesinde `showPrice: product.showPrice,` satırının altına ekle:

```tsx
          showPrice: product.showPrice,
          portions: (product.portions as Portion[] | null) ?? null,
```

- [ ] **Step 4: Tip kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
cd ~/Downloads/kunefe-house
git add components/admin/ProductForm.tsx "app/[locale]/admin/urunler/actions.ts" "app/[locale]/admin/urunler/[id]/page.tsx"
git commit -m "feat(admin): ürün formuna porsiyon kademeleri (oku/yaz/düzenle)"
```

---

## Task 7: `createOrder` public server action (best-effort + güvenlik)

**Files:**
- Create: `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`

- [ ] **Step 1: Action'ı yaz**

`app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`:

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { parsePortions } from "@/lib/portions";

export type OrderState = { ok?: boolean };

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

function num(v: FormDataEntryValue | null): number | null {
  const n = Number(typeof v === "string" ? v.trim() : NaN);
  return Number.isFinite(n) ? n : null;
}

/**
 * Public sipariş kaydı (müşteri auth'suz çağırır). Best-effort:
 * herhangi bir hata sessizce yutulur; istemci her durumda WhatsApp'ı açar.
 */
export async function createOrder(formData: FormData): Promise<OrderState> {
  try {
    // Honeypot: bot doldurursa sessizce başarı dön, kaydetme
    if (clamp(formData.get("website"), 100)) return { ok: true };

    const productId = clamp(formData.get("productId"), 64) || null;
    const productTitle = clamp(formData.get("productTitle"), 200) || "—";
    const customerName = clamp(formData.get("customerName"), 120) || null;
    const customerPhone = clamp(formData.get("customerPhone"), 32) || null;
    const addressNote = clamp(formData.get("addressNote"), 1000) || null;
    const note = clamp(formData.get("note"), 1000) || null;

    // Telefon: en az 10 rakam değilse kaydı atla (yine ok dön)
    if (!customerPhone || (customerPhone.match(/\d/g)?.length ?? 0) < 10) return { ok: true };

    let persons = num(formData.get("persons"));
    if (persons !== null) persons = Math.round(persons);
    if (persons !== null && (persons <= 0 || persons > 1000)) persons = null;

    // lat/lng aralık doğrulaması
    let lat = num(formData.get("lat"));
    let lng = num(formData.get("lng"));
    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      lat = null;
      lng = null;
    }
    const locationUrl = lat !== null && lng !== null ? `https://maps.google.com/?q=${lat},${lng}` : null;

    // Fiyat: mümkünse SUNUCUDAKİ porsiyon fiyatını yaz (istemciye güvenme)
    let price: number | null = null;
    if (productId && persons !== null) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { portions: true, price: true },
      });
      if (product) {
        const portions = parsePortions(JSON.stringify(product.portions ?? []));
        const match = portions.find((p) => p.persons === persons);
        if (match) price = match.price;
        else if (product.price != null) price = Number(product.price);
      }
    }

    await prisma.order.create({
      data: {
        productId,
        productTitle,
        persons,
        price,
        customerName,
        customerPhone,
        addressNote,
        note,
        locationUrl,
        lat,
        lng,
      },
    });
    return { ok: true };
  } catch {
    return { ok: true }; // best-effort: müşteriyi asla engelleme
  }
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd ~/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/[slug]/order-actions.ts"
git commit -m "feat: public createOrder action (best-effort + güvenlik kalkanları)"
```

---

## Task 8: `OrderFlow` müşteri bileşeni (seçici + sipariş kartı + geolocation)

**Files:**
- Create: `components/public/OrderFlow.tsx`

- [ ] **Step 1: Bileşeni yaz**

`components/public/OrderFlow.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n-field";
import type { Portion } from "@/lib/portions";
import { portionLabel } from "@/lib/portions";
import { formatPrice, discountPercent } from "@/lib/price";
import { buildOrderMessage } from "@/lib/order-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { createOrder } from "@/app/[locale]/lezzetlerimiz/[slug]/order-actions";

type Props = {
  productId: string;
  productName: string;
  locale: Locale;
  whatsappNumber: string | null;
  showPrice: boolean;
  portions: Portion[];
  singlePrice: number | null;
  singleOldPrice: number | null;
};

export function OrderFlow({
  productId, productName, locale, whatsappNumber, showPrice, portions, singlePrice, singleOldPrice,
}: Props) {
  const t = useTranslations("order");
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locState, setLocState] = useState<"idle" | "ok" | "fail">("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [note, setNote] = useState("");

  const hasPortions = portions.length > 0;
  const activePortion = hasPortions ? portions[selected] : null;
  const price = hasPortions ? activePortion!.price : singlePrice;
  const oldPrice = hasPortions ? activePortion?.oldPrice ?? null : singleOldPrice;
  const persons = activePortion?.persons ?? 1;
  const discount = showPrice ? discountPercent(price, oldPrice) : null;
  const priceText = showPrice && price != null ? formatPrice(price, locale) : null;

  const valid = name.trim() && (phone.match(/\d/g)?.length ?? 0) >= 10 && addressNote.trim();

  function shareLocation() {
    if (!navigator.geolocation) { setLocState("fail"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocState("ok"); },
      () => setLocState("fail"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const waHref = useMemo(() => {
    if (!whatsappNumber) return null;
    const locationUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const message = buildOrderMessage({
      productName, persons, priceText, customerName: name, customerPhone: phone,
      addressNote, note, locationUrl, locale,
    });
    return buildWhatsAppHref(whatsappNumber, message);
  }, [whatsappNumber, lat, lng, productName, persons, priceText, name, phone, addressNote, note, locale]);

  async function submit() {
    if (!valid || !waHref) return;
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("productTitle", productName);
    fd.set("persons", String(persons));
    fd.set("customerName", name);
    fd.set("customerPhone", phone);
    fd.set("addressNote", addressNote);
    fd.set("note", note);
    if (lat != null && lng != null) { fd.set("lat", String(lat)); fd.set("lng", String(lng)); }
    try { await createOrder(fd); } catch { /* best-effort */ }
    window.open(waHref, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div className="mt-6">
      {/* Porsiyon seçici */}
      {hasPortions && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-cream/70">{t("selectPortion")}</p>
          <div className="flex flex-wrap gap-2">
            {portions.map((p, i) => (
              <button key={p.persons} type="button" onClick={() => setSelected(i)}
                className={`rounded-full px-4 py-1.5 text-sm transition-all ${i === selected ? "pill-gold" : "btn-outline-gold"}`}>
                {portionLabel(p.persons, locale)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fiyat */}
      {priceText && (
        <div className="mb-4 flex items-center gap-3">
          <span className="font-serif text-3xl text-gold">{priceText}</span>
          {oldPrice != null && oldPrice > (price ?? 0) && (
            <span className="text-lg text-cream/40 line-through">{formatPrice(oldPrice, locale)}</span>
          )}
          {discount != null && (
            <span className="rounded-full bg-copper px-2.5 py-1 text-xs font-bold text-cream">%{discount} İNDİRİM</span>
          )}
        </div>
      )}

      {/* Sipariş butonu */}
      {whatsappNumber && (
        <button type="button" onClick={() => setOpen(true)}
          className="btn-gold rounded-full px-7 py-3 text-sm font-semibold">
          {t("orderButton")}
        </button>
      )}

      {/* Sipariş kartı (modal) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}>
          <div className="card-premium w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-serif text-xl text-gold-gradient">{productName}{hasPortions ? ` · ${portionLabel(persons, locale)}` : ""}</h3>

            {/* Honeypot */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />

            <button type="button" onClick={shareLocation}
              className={`mb-3 w-full rounded-lg border px-4 py-2.5 text-sm ${locState === "ok" ? "border-green-400/60 text-green-400" : "border-gold/50 text-gold hover:bg-gold/10"}`}>
              {locState === "ok" ? t("locationReceived") : `📍 ${t("shareLocation")}`}
            </button>
            {locState === "fail" && <p className="mb-3 text-xs text-red-400">{t("locationFailed")}</p>}

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")}
              className="mb-3 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone")} inputMode="tel"
              className="mb-3 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
            <textarea value={addressNote} onChange={(e) => setAddressNote(e.target.value)} placeholder={t("addressNote")} rows={2}
              className="mb-3 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("extraNote")} rows={2}
              className="mb-4 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />

            {!valid && <p className="mb-3 text-xs text-cream/50">{t("requiredHint")}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-cream/30 px-4 py-2.5 text-sm text-cream/70">
                {t("cancel")}
              </button>
              <button type="button" onClick={submit} disabled={!valid}
                className="btn-gold flex-[2] rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {t("send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd ~/Downloads/kunefe-house
git add components/public/OrderFlow.tsx
git commit -m "feat: OrderFlow — porsiyon seçici + sipariş kartı + GPS konum + WhatsApp"
```

---

## Task 9: Ürün detay sayfasına OrderFlow'u göm

**Files:**
- Modify: `app/[locale]/lezzetlerimiz/[slug]/page.tsx`

- [ ] **Step 1: Import + veri hazırlığı ekle**

`app/[locale]/lezzetlerimiz/[slug]/page.tsx` — importlara ekle:

```ts
import { getSiteSettings } from "@/lib/settings";
import { parsePortions } from "@/lib/portions";
import { OrderFlow } from "@/components/public/OrderFlow";
```

`const discount = ...` satırının altına ekle:

```ts
  const settings = await getSiteSettings().catch(() => null);
  const portions = parsePortions(JSON.stringify(product.portions ?? []));
```

- [ ] **Step 2: Statik fiyat bloğunu OrderFlow ile değiştir**

Aynı dosyada şu bloğu (mevcut fiyat gösterimi):

```tsx
        {priceVisible && (
          <div className="mt-6 flex items-center gap-3">
            <span className="font-serif text-3xl text-gold">{formatPrice(price, loc)}</span>
            {oldPrice != null && oldPrice > (price ?? 0) && (
              <span className="text-lg text-cream/40 line-through">{formatPrice(oldPrice, loc)}</span>
            )}
            {discount != null && (
              <span className="rounded-full bg-copper px-2.5 py-1 text-xs font-bold text-cream">%{discount} İNDİRİM</span>
            )}
          </div>
        )}
```

şununla değiştir:

```tsx
        <OrderFlow
          productId={product.id}
          productName={name}
          locale={loc}
          whatsappNumber={settings?.whatsappNumber ?? null}
          showPrice={product.showPrice}
          portions={portions}
          singlePrice={price}
          singleOldPrice={oldPrice}
        />
```

> Not: `price`, `oldPrice`, `priceVisible`, `discount` değişkenleri artık yalnız OrderFlow'a veri sağlamak için kullanılıyor olabilir. `priceVisible` ve `discount` artık kullanılmıyorsa tsc "unused" uyarısı vermez (sadece atama), ama lint temizliği için kullanılmayan `priceVisible`/`discount` satırlarını silebilirsin. `price` ve `oldPrice` OrderFlow'a geçtiği için kalmalı.

- [ ] **Step 3: Kullanılmayan değişkenleri temizle**

`const priceVisible = ...` ve `const discount = ...` satırlarını sil (artık OrderFlow kendi içinde hesaplıyor). `formatPrice`/`discountPercent` importu başka yerde kullanılmıyorsa import satırından çıkar (`toNumber` kalır).

- [ ] **Step 4: Tip + lint kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit && npx eslint app/[locale]/lezzetlerimiz/[slug]/page.tsx`
Expected: tsc Exit 0; eslint hatasız (kullanılmayan değişken/import uyarısı yok).

- [ ] **Step 5: Commit**

```bash
cd ~/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/[slug]/page.tsx"
git commit -m "feat: ürün detayına OrderFlow entegrasyonu"
```

---

## Task 10: ProductCard — porsiyonlu üründe "…'den başlayan" fiyat

**Files:**
- Modify: `components/public/ProductCard.tsx`
- Modify: `app/[locale]/lezzetlerimiz/page.tsx`

- [ ] **Step 1: ProductCard'a porsiyon desteği ekle**

`components/public/ProductCard.tsx` — importlara ekle:

```tsx
import { useTranslations } from "next-intl";
import type { Portion } from "@/lib/portions";
import { minPortionPrice } from "@/lib/portions";
```

Prop tipine ekle (`showPrice?: boolean;` satırının altına):

```tsx
  showPrice?: boolean;
  portions?: Portion[] | null;
```

Bileşen gövdesinin başına (mevcut `const priceVisible = ...` satırının üstüne) ekle:

```tsx
  const t = useTranslations("order");
  const portionList = portions ?? [];
  const fromPrice = portionList.length > 0 ? minPortionPrice(portionList) : null;
```

`const priceVisible = showPrice && price != null;` satırını şununla değiştir:

```tsx
  const priceVisible = showPrice && (price != null || fromPrice != null);
```

Fiyat gösterim bloğunu (`{priceVisible && ( ... )}`) şununla değiştir:

```tsx
          {priceVisible && (
            <div className="mt-3 flex items-baseline gap-2">
              {fromPrice != null ? (
                <span className="font-serif text-lg text-gold">{t("fromPrice", { price: fromPrice })}</span>
              ) : (
                <>
                  <span className="font-serif text-lg text-gold">{formatPrice(price ?? null, locale)}</span>
                  {oldPrice != null && oldPrice > (price ?? 0) && (
                    <span className="text-sm text-cream/40 line-through">{formatPrice(oldPrice, locale)}</span>
                  )}
                </>
              )}
            </div>
          )}
```

> `discount` rozeti yalnız tekil fiyatta vardı; porsiyonlu kartta gösterilmez (detayda gösterilir). `const discount = ...` satırı kalabilir (tekil fiyat için kullanılıyor).

- [ ] **Step 2: Liste sayfasında karta portions geçir**

`app/[locale]/lezzetlerimiz/page.tsx` — `ProductCard` çağrısında `showPrice={p.showPrice}` ifadesinin yanına ekle:

```tsx
              price={toNumber(p.price)} oldPrice={toNumber(p.oldPrice)} showPrice={p.showPrice}
              portions={(p.portions as Portion[] | null) ?? null} />
```

Aynı dosyada importlara ekle:

```ts
import type { Portion } from "@/lib/portions";
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd ~/Downloads/kunefe-house
git add components/public/ProductCard.tsx "app/[locale]/lezzetlerimiz/page.tsx"
git commit -m "feat: ürün kartında porsiyonlu üründe başlangıç fiyatı"
```

---

## Task 11: Admin Siparişler sayfası + actions + lib + sidebar

**Files:**
- Create: `lib/orders.ts`
- Create: `app/[locale]/admin/siparisler/actions.ts`
- Create: `app/[locale]/admin/siparisler/page.tsx`
- Modify: `app/[locale]/admin/layout.tsx`

- [ ] **Step 1: `lib/orders.ts` yaz**

`lib/orders.ts`:

```ts
import { cache } from "react";
import { prisma } from "./prisma";

export const getOrders = cache(async () => {
  return prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
});
```

- [ ] **Step 2: actions yaz**

`app/[locale]/admin/siparisler/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

export async function updateOrderStatus(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "new";
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/siparisler");
}

export async function deleteOrder(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.order.delete({ where: { id } });
  revalidatePath("/admin/siparisler");
}
```

- [ ] **Step 3: Sayfayı yaz**

`app/[locale]/admin/siparisler/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getOrders } from "@/lib/orders";
import { toNumber, formatPrice } from "@/lib/price";
import { updateOrderStatus, deleteOrder } from "./actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Yeni", cls: "text-gold" },
  confirmed: { label: "Onaylandı", cls: "text-pistachio" },
  on_the_way: { label: "Yolda", cls: "text-blue-400" },
  delivered: { label: "Teslim edildi", cls: "text-green-400" },
  cancelled: { label: "İptal", cls: "text-red-400" },
};

export default async function SiparislerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const orders = await getOrders();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Siparişler ({orders.length})</h1>
      <ul className="flex flex-col gap-3">
        {orders.map((o) => {
          const price = toNumber(o.price);
          return (
            <li key={o.id} className="card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-cream">
                  {o.productTitle}{o.persons ? ` · ${o.persons} kişilik` : ""}
                  {price != null ? ` · ${formatPrice(price, "tr")}` : ""}
                  <span className={`ml-2 text-xs ${STATUS[o.status]?.cls ?? "text-cream/60"}`}>● {STATUS[o.status]?.label ?? o.status}</span>
                </p>
                <p className="text-sm text-cream/70">
                  {o.customerName ?? "—"}{o.customerPhone ? ` · ${o.customerPhone}` : ""}
                </p>
                {o.addressNote && <p className="mt-1 text-sm text-cream/50">{o.addressNote}</p>}
                {o.note && <p className="mt-1 text-sm text-cream/50">📝 {o.note}</p>}
                <p className="mt-1 text-xs text-cream/40">{new Date(o.createdAt).toLocaleString("tr-TR")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {o.locationUrl && (
                  <a href={o.locationUrl} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">📍 Konum</a>
                )}
                {o.customerPhone && (
                  <a href={`https://wa.me/${o.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">WhatsApp</a>
                )}
                <form action={updateOrderStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <select name="status" defaultValue={o.status}
                    className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
                    <option value="new">Yeni</option>
                    <option value="confirmed">Onaylandı</option>
                    <option value="on_the_way">Yolda</option>
                    <option value="delivered">Teslim edildi</option>
                    <option value="cancelled">İptal</option>
                  </select>
                  <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Güncelle</button>
                </form>
                <form action={deleteOrder}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-sm text-red-400">Sil</button>
                </form>
              </div>
            </li>
          );
        })}
        {orders.length === 0 && <p className="text-cream/60">Henüz sipariş yok.</p>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Sidebar'a link ekle**

`app/[locale]/admin/layout.tsx` — `<Link href="/admin/urunler">Ürünler</Link>` satırının altına ekle:

```tsx
        <Link href="/admin/urunler">Ürünler</Link>
        <Link href="/admin/siparisler">Siparişler</Link>
```

- [ ] **Step 5: Tip kontrolü**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
cd ~/Downloads/kunefe-house
git add lib/orders.ts "app/[locale]/admin/siparisler" "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): Siparişler sayfası (liste/durum/sil) + sidebar linki"
```

---

## Task 12: Tam doğrulama + build + deploy

**Files:** (yok — doğrulama)

- [ ] **Step 1: Tüm testler**

Run: `cd ~/Downloads/kunefe-house && npx vitest run`
Expected: Tüm testler PASS (portions + order-message dahil, eski testler bozulmamış).

- [ ] **Step 2: Tip + lint**

Run: `cd ~/Downloads/kunefe-house && npx tsc --noEmit && npm run lint`
Expected: tsc Exit 0; lint hatasız.

- [ ] **Step 3: Production build**

Run: `cd ~/Downloads/kunefe-house && npm run build`
Expected: Build başarılı; `/[locale]/lezzetlerimiz/[slug]`, `/[locale]/admin/siparisler` derlenmiş.

- [ ] **Step 4: Manuel önizleme (dev server)**

Run: `cd ~/Downloads/kunefe-house && npm run dev` (ayrı terminal) → tarayıcıda:
- Admin > Ürünler > bir ürünü düzenle → "Porsiyon ekle" ile 2/4/6 kişilik fiyat gir, kaydet.
- Ürün detay sayfası → porsiyon seçici görünür, seçince fiyat değişir.
- "Sipariş Ver" → kart açılır → "Konumumu Paylaş" izin akışı → ad/telefon/adres doldur → "WhatsApp'tan Gönder" → wa.me doğru mesajla yeni sekmede açılır.
- Admin > Siparişler → yeni kayıt görünür; konum linki Maps açar; durum güncelleme/sil çalışır.
- Porsiyonsuz eski ürün → eski tekil-fiyat davranışı bozulmamış (regresyon yok).
- Telefonda (DevTools mobil) sipariş kartı alttan açılır, kullanılabilir.

- [ ] **Step 5: Push (deploy)**

```bash
cd ~/Downloads/kunefe-house
git push origin main
```
Expected: Vercel otomatik build + deploy. Canlıda doğrula.

---

## Self-Review Notları (plan yazarı tarafından doğrulandı)

- **Spec kapsamı:** Porsiyon modeli (Task 1,2,6), seçici+fiyat (Task 8,9), GPS adres akışı (Task 8), WhatsApp mesajı (Task 3,8), DB kaydı best-effort (Task 7), admin liste (Task 11), güvenlik kalkanları (Task 7), i18n (Task 4), geriye dönük uyumluluk (Task 9 fallback + Task 12 regresyon) — hepsi karşılandı.
- **Tip tutarlılığı:** `Portion` tipi `lib/portions.ts`'de tek kaynak; tüm tüketiciler import eder. `parsePortions` her yerde `string` alır (Json alanları `JSON.stringify` ile beslenir). `formatPrice`/`discountPercent`/`toNumber` mevcut `lib/price.ts`'den.
- **Placeholder yok:** Tüm adımlar tam kod içerir.
