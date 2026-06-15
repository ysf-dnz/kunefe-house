# Faz 1 — Katalog + Stok Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Şube bazlı katalog override'ı: `BranchProduct` (var/yok + stok + yerel ₺ fiyat, seyrek), efektif çözümleme yardımcısı, şube yöneticisine `/admin/menu`.

**Architecture:** Additive `BranchProduct` join tablosu (sparse — satır yoksa açık/merkez fiyat). Saf `effectiveProduct` (TDD) + `getBranchMenu` okuma. Şube admin sayfası satır başına server-action form ile upsert/sil; branchId her zaman me.branchId (IDOR yok). Public değişmez (Faz 2).

**Tech Stack:** Next.js 16.2, Prisma 7.8 + Supabase, Vitest.

---

## File Structure
- `prisma/schema.prisma` — BranchProduct + Branch/Product ters ilişkileri.
- `lib/branch-catalog.ts` (+ test) — effectiveProduct + getBranchMenu.
- `app/[locale]/admin/menu/actions.ts` — saveBranchProduct (BRANCH_ADMIN).
- `app/[locale]/admin/menu/page.tsx` — şube menü/stok sayfası.
- `app/[locale]/admin/layout.tsx` — BRANCH_ADMIN "Menü / Stok" linki.

---

## Task 1: Şema + Migration

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: BranchProduct modeli + ters ilişkiler**

`prisma/schema.prisma` SONUNA ekle:
```prisma
model BranchProduct {
  id         String   @id @default(cuid())
  branchId   String
  branch     Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  available  Boolean  @default(true)
  stock      Int?
  localPrice Decimal? @db.Decimal(10, 2)
  updatedAt  DateTime @updatedAt

  @@unique([branchId, productId])
}
```
`Branch` modeline ekle: `  branchProducts BranchProduct[]`
`Product` modeline ekle: `  branchProducts BranchProduct[]`

- [ ] **Step 2: Migration**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name branch_product`
Expected: migration uygulanır + client üretilir. (P1001 → 3 kez dene; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 3: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): BranchProduct (şube katalog override) M:N"
```

---

## Task 2: `lib/branch-catalog.ts` — effectiveProduct (TDD) + getBranchMenu

**Files:** Create `lib/branch-catalog.ts`, `tests/unit/branch-catalog.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/branch-catalog.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { effectiveProduct } from "@/lib/branch-catalog";

describe("effectiveProduct", () => {
  it("override yoksa açık + merkez fiyatı", () => {
    expect(effectiveProduct({ price: 320 }, null)).toEqual({ available: true, stock: null, price: 320 });
  });
  it("available=false → kapalı", () => {
    expect(effectiveProduct({ price: 320 }, { available: false, stock: null, localPrice: null }))
      .toEqual({ available: false, stock: null, price: 320 });
  });
  it("stock=0 → kapalı (available true olsa da)", () => {
    expect(effectiveProduct({ price: 320 }, { available: true, stock: 0, localPrice: null }))
      .toEqual({ available: false, stock: 0, price: 320 });
  });
  it("localPrice doluysa ₺ fiyatı ezilir", () => {
    expect(effectiveProduct({ price: 320 }, { available: true, stock: 5, localPrice: 280 }))
      .toEqual({ available: true, stock: 5, price: 280 });
  });
  it("merkez fiyatı yoksa null kalır", () => {
    expect(effectiveProduct({ price: null }, null)).toEqual({ available: true, stock: null, price: null });
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/branch-catalog.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: `lib/branch-catalog.ts` yaz**
```ts
import { cache } from "react";
import { prisma } from "./prisma";

type Central = { price: number | null };
type Override = { available: boolean; stock: number | null; localPrice: number | null } | null;

export function effectiveProduct(central: Central, override: Override): {
  available: boolean;
  stock: number | null;
  price: number | null;
} {
  const stock = override?.stock ?? null;
  const available = (override?.available ?? true) && stock !== 0;
  const price = override?.localPrice ?? central.price ?? null;
  return { available, stock, price };
}

/** Tüm katalog + verilen şubenin override'larıyla birleştirilmiş liste. */
export const getBranchMenu = cache(async (branchId: string) => {
  const [products, overrides] = await Promise.all([
    prisma.product.findMany({ orderBy: { order: "asc" } }),
    prisma.branchProduct.findMany({ where: { branchId } }),
  ]);
  const map = new Map(overrides.map((o) => [o.productId, o]));
  return products.map((p) => ({ product: p, override: map.get(p.id) ?? null }));
});
```

- [ ] **Step 4: Pass doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/branch-catalog.test.ts && npx tsc --noEmit`
Expected: testler PASS; tsc Exit 0 (gerekirse önce `npx prisma generate`).

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/branch-catalog.ts tests/unit/branch-catalog.test.ts
git commit -m "feat: branch-catalog effectiveProduct + getBranchMenu (TDD)"
```

---

## Task 3: saveBranchProduct action (BRANCH_ADMIN, upsert/sil)

**Files:** Create `app/[locale]/admin/menu/actions.ts`

- [ ] **Step 1: Action'ı yaz**
```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function saveBranchProduct(formData: FormData) {
  const me = await requireAdmin();
  if (me.role !== "BRANCH_ADMIN" || !me.branchId) throw new Error("Yalnız şube yöneticisi");
  const branchId = me.branchId;
  const productId = formData.get("productId") as string;
  if (!productId) throw new Error("Ürün gerekli");

  const available = formData.get("available") === "on";

  const stockRaw = ((formData.get("stock") as string) ?? "").trim();
  let stock: number | null = null;
  if (stockRaw !== "") {
    const n = Math.round(Number(stockRaw));
    stock = Number.isFinite(n) && n >= 0 ? n : null;
  }

  const lpRaw = ((formData.get("localPrice") as string) ?? "").trim().replace(",", ".");
  let localPrice: number | null = null;
  if (lpRaw !== "") {
    const n = Number(lpRaw);
    localPrice = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }

  // Seyrek: hepsi varsayılansa satırı sil
  if (available && stock === null && localPrice === null) {
    await prisma.branchProduct.deleteMany({ where: { branchId, productId } });
  } else {
    await prisma.branchProduct.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: { available, stock, localPrice },
      create: { branchId, productId, available, stock, localPrice },
    });
  }
  revalidatePath("/admin/menu");
}
```

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/menu/actions.ts"
git commit -m "feat(admin): saveBranchProduct (şube override upsert/sil, IDOR korumalı)"
```

---

## Task 4: Şube Menü/Stok sayfası

**Files:** Create `app/[locale]/admin/menu/page.tsx`

- [ ] **Step 1: Sayfayı yaz**
```tsx
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getBranchMenu, effectiveProduct } from "@/lib/branch-catalog";
import { toNumber, formatPrice } from "@/lib/price";
import { saveBranchProduct } from "./actions";

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const me = await requireAdmin();
  if (me.role !== "BRANCH_ADMIN" || !me.branchId) redirect("/admin");
  const { locale } = await params;
  setRequestLocale(locale);
  const rows = await getBranchMenu(me.branchId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Menü / Stok</h1>
      <p className="text-sm text-cream/60">Ürünü kapat, stok ve yerel ₺ fiyat gir. Boş bırakırsan merkez ayarı geçerli.</p>

      <ul className="flex flex-col gap-3">
        {rows.map(({ product, override }) => {
          const central = { price: toNumber(product.price) };
          const eff = effectiveProduct(central, override ? { available: override.available, stock: override.stock, localPrice: toNumber(override.localPrice) } : null);
          const title = (product.title as Record<string, string>)?.tr || product.slug;
          return (
            <li key={product.id} className="card-premium rounded-xl p-4">
              <form action={saveBranchProduct} className="flex flex-wrap items-end gap-4">
                <input type="hidden" name="productId" value={product.id} />
                <div className="min-w-[10rem] flex-1">
                  <p className="font-medium text-cream">{title}</p>
                  <p className="text-xs text-cream/50">Merkez ₺: {central.price != null ? formatPrice(central.price, "TRY") : "—"} · Durum: {eff.available ? "Açık" : "Kapalı"}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-cream/80">
                  <input type="checkbox" name="available" defaultChecked={override?.available ?? true} /> Açık
                </label>
                <label className="flex flex-col gap-1 text-xs text-cream/70">Stok
                  <input name="stock" type="number" min="0" defaultValue={override?.stock ?? ""} placeholder="∞"
                    className="w-24 rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-cream/70">Yerel ₺
                  <input name="localPrice" type="number" min="0" step="0.01" defaultValue={toNumber(override?.localPrice) ?? ""}
                    placeholder={central.price != null ? String(central.price) : "—"}
                    className="w-28 rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" />
                </label>
                <button className="rounded bg-gold/20 px-4 py-2 text-sm text-gold">Kaydet</button>
              </form>
            </li>
          );
        })}
        {rows.length === 0 && <p className="text-cream/60">Katalogda ürün yok (Genel Merkez ürün eklemeli).</p>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/menu/page.tsx"
git commit -m "feat(admin): şube Menü/Stok sayfası (BRANCH_ADMIN)"
```

---

## Task 5: Sidebar — BRANCH_ADMIN "Menü / Stok" linki

**Files:** Modify `app/[locale]/admin/layout.tsx`

- [ ] **Step 1: Link ekle**

`app/[locale]/admin/layout.tsx` içinde, `<Link href="/admin/kuryeler">Kuryeler</Link>` satırının altına (HQ koşulu DIŞINDA, tüm adminler görsün diye değil — yalnız şube), ekle:
```tsx
        {!isHQ && <Link href="/admin/menu">Menü / Stok</Link>}
```
(HQ bu sayfaya girmez; link yalnız şube yöneticisine görünür.)

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): sidebar şube Menü/Stok linki"
```

---

## Task 6: Tam doğrulama + build + deploy

- [ ] **Step 1: testler + tsc + build**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error|admin/menu" | head`
Expected: testler PASS; tsc Exit 0; build başarılı; `/[locale]/admin/menu` derlenmiş.

- [ ] **Step 2: Manuel doğrulama (dev)**
Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- BRANCH_ADMIN ile giriş → "Menü / Stok" linki görünür; katalog listelenir, hepsi varsayılan "Açık".
- Bir ürünü kapat + stok/yerel ₺ gir → Kaydet → değer kalıcı (override satırı oluştu). Tekrar varsayılana çevir (açık, stok boş, fiyat boş) → Kaydet → satır silinir (seyrek).
- HQ ile `/admin/menu`'ye URL ile gidince /admin'e atılır.
- IDOR: şube admin yalnız kendi şubesinin override'larını yazar.
- Public + Faz 0 regresyonsuz.

- [ ] **Step 3: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`.)

---

## Self-Review Notları
- **Spec kapsamı:** BranchProduct model (T1), effectiveProduct+getBranchMenu TDD (T2), saveBranchProduct upsert/sil IDOR (T3), şube menü sayfası (T4), sidebar (T5), doğrulama (T6). Tümü karşılandı.
- **Tip tutarlılığı:** `effectiveProduct(central, override)` imzası T2'de tanımlı, T4'te aynı şekilde besleniyor (Decimal'ler `toNumber` ile number'a). compound unique `branchId_productId` T3 upsert'te.
- **Güvenlik:** saveBranchProduct branchId = me.branchId (formdan değil); role BRANCH_ADMIN zorlanır. Sayfa HQ'yu /admin'e atar.
- **Decimal:** localPrice/price `toNumber` ile client'a; `formatPrice(.., "TRY")`.
- **Placeholder yok:** tüm adımlar tam kod.
