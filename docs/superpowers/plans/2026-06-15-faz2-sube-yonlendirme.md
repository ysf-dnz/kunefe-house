# Faz 2 — Şube Yönlendirme + Public Şube Menüsü Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Müşteri üst bardan şube seçer (veya konumdan en yakını); public katalog seçili şubenin efektif menüsünü gösterir (var/yok+stok+yerel ₺); sipariş seçili şubeye düşer.

**Architecture:** Cookie (`kh_branch`) + server `getSelectedBranch`. Saf `nearestBranch` (haversine, TDD). Client `BranchPicker` header'da → `setBranch`/`setNearestBranch` server action'ları. Liste/detay `getBranchMenu`+`effectiveProduct` ile şube-duyarlı; ProductCard "Tükendi"/yerel ₺. createOrder branchId'yi cookie'den alır. Şube seçilmezse merkez katalog (regresyonsuz).

**Tech Stack:** Next.js 16.2 (async cookies()), Prisma 7.8, next-intl, Vitest.

---

## File Structure
- `lib/branch-select.ts` (+test) — nearestBranch + getSelectedBranch + getActiveBranches.
- `app/[locale]/branch-actions.ts` — setBranch/setNearestBranch.
- `components/layout/BranchPicker.tsx` (client).
- `components/layout/Header.tsx` + `HeaderClient.tsx` — picker yerleştir.
- `app/[locale]/lezzetlerimiz/page.tsx`, `[slug]/page.tsx`, `components/public/ProductCard.tsx`, `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`.

---

## Task 1: `lib/branch-select.ts` — nearestBranch (TDD) + okuma

**Files:** Create `lib/branch-select.ts`, `tests/unit/branch-select.test.ts`

- [ ] **Step 1: Test (failing)**

`tests/unit/branch-select.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { nearestBranch } from "@/lib/branch-select";

const branches = [
  { id: "ist", name: "İstanbul", lat: 41.01, lng: 28.97 },
  { id: "ank", name: "Ankara", lat: 39.93, lng: 32.85 },
  { id: "nocoord", name: "Koordinatsız", lat: null, lng: null },
];

describe("nearestBranch", () => {
  it("en yakın şubeyi döner", () => {
    expect(nearestBranch(41.0, 29.0, branches)?.id).toBe("ist");
    expect(nearestBranch(39.9, 32.8, branches)?.id).toBe("ank");
  });
  it("koordinatsız şubeleri atlar", () => {
    expect(nearestBranch(41.0, 29.0, [{ id: "x", name: "X", lat: null, lng: null }])).toBeNull();
  });
  it("aday yoksa null", () => {
    expect(nearestBranch(0, 0, [])).toBeNull();
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/branch-select.test.ts`
Expected: FAIL.

- [ ] **Step 3: `lib/branch-select.ts` yaz**
```ts
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type GeoBranch = { id: string; name: string; lat: number | null; lng: number | null };

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Konuma en yakın (lat/lng'si olan) şube; aday yoksa null. */
export function nearestBranch<T extends GeoBranch>(lat: number, lng: number, branches: T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const b of branches) {
    if (b.lat == null || b.lng == null) continue;
    const d = haversine(lat, lng, b.lat, b.lng);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

export const getActiveBranches = cache(async () => {
  return prisma.branch.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
});

/** Cookie'deki seçili aktif şube (yoksa/pasifse null). */
export const getSelectedBranch = cache(async () => {
  const id = (await cookies()).get("kh_branch")?.value;
  if (!id) return null;
  return prisma.branch.findFirst({ where: { id, isActive: true } });
});
```

- [ ] **Step 4: Pass + tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/branch-select.test.ts && npx tsc --noEmit`
Expected: PASS; Exit 0.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/branch-select.ts tests/unit/branch-select.test.ts
git commit -m "feat: branch-select nearestBranch (TDD) + getSelectedBranch/getActiveBranches"
```

---

## Task 2: Şube cookie action'ları

**Files:** Create `app/[locale]/branch-actions.ts`

- [ ] **Step 1: Yaz**
```ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { nearestBranch } from "@/lib/branch-select";

const COOKIE = "kh_branch";
const MAXAGE = 60 * 60 * 24 * 365;

export async function setBranch(branchId: string | null) {
  const jar = await cookies();
  if (!branchId) {
    jar.delete(COOKIE);
  } else {
    const b = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } });
    if (b) jar.set(COOKIE, b.id, { path: "/", maxAge: MAXAGE });
  }
  revalidatePath("/", "layout");
}

export async function setNearestBranch(lat: number, lng: number): Promise<string | null> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, lat: true, lng: true },
  });
  const n = nearestBranch(lat, lng, branches);
  if (!n) return null;
  (await cookies()).set(COOKIE, n.id, { path: "/", maxAge: MAXAGE });
  revalidatePath("/", "layout");
  return n.name;
}
```

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/branch-actions.ts"
git commit -m "feat: şube seçim cookie action'ları (setBranch/setNearestBranch)"
```

---

## Task 3: BranchPicker + Header'a yerleştir

**Files:** Create `components/layout/BranchPicker.tsx`; Modify `components/layout/Header.tsx`, `components/layout/HeaderClient.tsx`

- [ ] **Step 1: BranchPicker (client)**

`components/layout/BranchPicker.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBranch, setNearestBranch } from "@/app/[locale]/branch-actions";

type B = { id: string; name: string };

export function BranchPicker({ branches, selectedId }: { branches: B[]; selectedId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (branches.length === 0) return null;

  const selected = branches.find((b) => b.id === selectedId);

  function choose(id: string | null) {
    start(async () => { await setBranch(id); setOpen(false); router.refresh(); });
  }
  function nearest() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      start(async () => { await setNearestBranch(pos.coords.latitude, pos.coords.longitude); setOpen(false); router.refresh(); });
    });
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} disabled={pending}
        className="flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10">
        🏪 {selected ? selected.name : "Şube seç"}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-copper/30 bg-forest-light p-2 shadow-xl">
          <button type="button" onClick={nearest}
            className="mb-1 w-full rounded px-3 py-2 text-left text-sm text-gold hover:bg-gold/10">📍 Bana en yakını</button>
          <button type="button" onClick={() => choose(null)}
            className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gold/10 ${!selectedId ? "text-gold" : "text-cream/80"}`}>Genel (merkez)</button>
          {branches.map((b) => (
            <button key={b.id} type="button" onClick={() => choose(b.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gold/10 ${b.id === selectedId ? "text-gold" : "text-cream/80"}`}>{b.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Header (server) — şube verisini geçir**

`components/layout/Header.tsx`:
```tsx
import { getSiteSettings } from "@/lib/settings";
import { getActiveBranches, getSelectedBranch } from "@/lib/branch-select";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [settings, branches, selected] = await Promise.all([
    getSiteSettings(),
    getActiveBranches(),
    getSelectedBranch(),
  ]);
  return (
    <HeaderClient
      logoUrl={settings?.logoHeaderUrl ?? null}
      logoHeight={settings?.logoHeight ?? 60}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      selectedBranchId={selected?.id ?? null}
    />
  );
}
```

- [ ] **Step 3: HeaderClient — BranchPicker render**

`components/layout/HeaderClient.tsx`: imzaya ekle `branches?: { id: string; name: string }[]; selectedBranchId?: string | null;` (varsayılan `branches = []`). `import { BranchPicker } from "./BranchPicker";`. `LanguageSwitcher`'ın yanına (aynı `flex items-center gap-4` içine, LanguageSwitcher'dan önce) ekle:
```tsx
          <BranchPicker branches={branches} selectedId={selectedBranchId ?? null} />
```

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/layout/BranchPicker.tsx components/layout/Header.tsx components/layout/HeaderClient.tsx
git commit -m "feat: üst barda şube seçici (BranchPicker + en yakını)"
```

---

## Task 4: Liste sayfası şube menüsü + ProductCard

**Files:** Modify `app/[locale]/lezzetlerimiz/page.tsx`, `components/public/ProductCard.tsx`

- [ ] **Step 1: ProductCard — soldOut + branchPrice**

`components/public/ProductCard.tsx`:
- Prop tipine ekle: `soldOut?: boolean; branchPrice?: number | null;` ve parametrelere `soldOut, branchPrice`.
- Currency hesabında, TRY ise branchPrice geçerli: mevcut `const single = productPriceForLocale(...)` SONRASINA ekle:
```tsx
  const effSinglePrice = currency === "TRY" && branchPrice != null ? branchPrice : single.price;
```
ve `cardPrice` hesabını `single.price` yerine `effSinglePrice` kullanacak şekilde güncelle: `const cardPrice = fromPrice != null ? fromPrice : effSinglePrice;`
- "Tükendi" rozeti: kapak `<div className="relative aspect-square...">` içine, indirim rozetinin yanına ekle:
```tsx
          {soldOut && (
            <span className="absolute end-3 top-3 rounded-full bg-forest-deep/80 px-2.5 py-1 text-xs font-bold text-cream ring-1 ring-cream/30">Tükendi</span>
          )}
```

- [ ] **Step 2: Liste sayfası — şube efektif menüsü**

`app/[locale]/lezzetlerimiz/page.tsx`:
- importlara ekle: `import { getSelectedBranch } from "@/lib/branch-select";` `import { getBranchMenu, effectiveProduct } from "@/lib/branch-catalog";`
- `const [products, categories, reels] = ...` sonrasına ekle:
```ts
  const branch = await getSelectedBranch();
  const effMap = new Map<string, { soldOut: boolean; branchPrice: number | null }>();
  if (branch) {
    const menu = await getBranchMenu(branch.id);
    for (const { product, override } of menu) {
      const eff = effectiveProduct(
        { price: toNumber(product.price) },
        override ? { available: override.available, stock: override.stock, localPrice: toNumber(override.localPrice) } : null
      );
      effMap.set(product.id, { soldOut: !eff.available, branchPrice: eff.price });
    }
  }
```
- `<ProductCard ... />` çağrısına ekle:
```tsx
              soldOut={effMap.get(p.id)?.soldOut ?? false}
              branchPrice={effMap.get(p.id)?.branchPrice ?? null}
```

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/page.tsx" components/public/ProductCard.tsx
git commit -m "feat: liste sayfası şube efektif menüsü (Tükendi + yerel ₺)"
```

---

## Task 5: Detay sayfası efektif fiyat/uygunluk

**Files:** Modify `app/[locale]/lezzetlerimiz/[slug]/page.tsx`

- [ ] **Step 1: Şube override uygula**

`app/[locale]/lezzetlerimiz/[slug]/page.tsx`:
- importlara ekle: `import { getSelectedBranch } from "@/lib/branch-select";` `import { effectiveProduct } from "@/lib/branch-catalog";` `import { prisma } from "@/lib/prisma";` (yoksa).
- `const portions = ...` sonrasına ekle:
```ts
  const branch = await getSelectedBranch();
  let branchSoldOut = false;
  let effPrice = price; // ₺ tekil
  if (branch) {
    const ov = await prisma.branchProduct.findUnique({
      where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    });
    const eff = effectiveProduct(
      { price },
      ov ? { available: ov.available, stock: ov.stock, localPrice: toNumber(ov.localPrice) } : null
    );
    branchSoldOut = !eff.available;
    effPrice = eff.price;
  }
```
- `<OrderFlow ... singlePrice={price} ...>`'i şu mantıkla sar: ürün şubede tükendiyse OrderFlow yerine bilgi bloğu. `<OrderFlow .../>`'u şununla değiştir:
```tsx
          {branchSoldOut ? (
            <p className="mt-6 rounded-lg border border-copper/40 px-4 py-3 text-cream/70">Bu şubede şu an tükendi.</p>
          ) : (
            <OrderFlow
              productId={product.id}
              productName={name}
              locale={loc}
              whatsappNumber={settings?.whatsappNumber ?? null}
              showPrice={product.showPrice}
              portions={portions}
              singlePrice={effPrice}
              singleOldPrice={oldPrice}
              singlePriceUsd={toNumber(product.priceUsd)}
              singleOldPriceUsd={toNumber(product.oldPriceUsd)}
              singlePriceQar={toNumber(product.priceQar)}
              singleOldPriceQar={toNumber(product.oldPriceQar)}
            />
          )}
```
(Yalnızca `singlePrice={price}` → `singlePrice={effPrice}` ve tükendi sarmalayıcı eklenir; diğer prop'lar aynı.)

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/[slug]/page.tsx"
git commit -m "feat: ürün detayında şube efektif fiyat + tükendi durumu"
```

---

## Task 6: createOrder — branchId cookie'den

**Files:** Modify `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`

- [ ] **Step 1: branchId ekle**

`app/[locale]/lezzetlerimiz/[slug]/order-actions.ts`:
- import ekle: `import { getSelectedBranch } from "@/lib/branch-select";`
- `prisma.order.create({ data: {...} })`'den ÖNCE: `const branch = await getSelectedBranch();`
- `data` nesnesine ekle (price/currency yanına): `branchId: branch?.id ?? null,`

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/[slug]/order-actions.ts"
git commit -m "feat: sipariş seçili şubeye düşer (branchId cookie'den)"
```

---

## Task 7: Tam doğrulama + build + deploy

- [ ] **Step 1: testler + tsc + build**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error" | head`
Expected: PASS; Exit 0; build başarılı.

- [ ] **Step 2: Manuel doğrulama (dev)**
Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Üst barda "Şube seç" → 2. şube (lat/lng'li) ekle (admin), seç → liste o şubenin menüsünü gösterir.
- O şubede bir ürünü kapat/stok 0 yap (şube admin) → public listede "Tükendi"; detayda "Bu şubede tükendi"; sipariş kapalı.
- Yerel ₺ fiyat → kart + detayda o fiyat (TR).
- "📍 Bana en yakını" → konumdan şube seçer.
- Sipariş ver → admin siparişlerde o şube görünür (branchId dolu).
- Şube "Genel" → merkez katalog (regresyon yok).

- [ ] **Step 3: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`.)

---

## Self-Review Notları
- **Spec kapsamı:** nearestBranch+cookie okuma (T1), cookie action'ları (T2), BranchPicker+header (T3), liste efektif menü+Tükendi+yerel ₺ (T4), detay efektif/uygunluk (T5), sipariş branchId (T6), doğrulama (T7). Tümü karşılandı.
- **Tip tutarlılığı:** `getSelectedBranch`/`getActiveBranches`/`nearestBranch`/`effectiveProduct`/`getBranchMenu` imzaları tüketicilerle uyumlu. `effectiveProduct` Faz 1'den. ProductCard `soldOut`/`branchPrice` T4'te tanımlı+geçiliyor. `branchId_productId` compound key (Faz 1).
- **Güvenlik/sağlamlık:** cookie branchId server'da `isActive` doğrulanır; geçersizse null. Decimal'ler toNumber. Şubesiz → merkez (regresyonsuz).
- **Sınır:** porsiyon/USD/QAR merkezî (Faz 1 kapsamı) — spec'te belirtildi.
- **Placeholder yok:** tüm adımlar tam kod.
