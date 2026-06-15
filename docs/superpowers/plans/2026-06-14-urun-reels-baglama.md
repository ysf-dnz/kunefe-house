# Reels-Ürün Bağlama (M2M) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reel'leri ürünlere many-to-many bağla; ürün detayı o ürünün reels'ini, ana sayfa+liste yalnız genel (bağsız) reels'i göstersin; bağlantı hem ürün formundan hem reels sayfasından yönetilsin.

**Architecture:** Prisma implicit M2M (`Product.reels` ↔ `Reel.products`). Public okuma `getGeneralReels` (bağsız) + `getProductBySlug` include reels. Admin formları çoklu seçim → server action `set` ile ilişkiyi değiştirir. Additive, geriye uyumlu (mevcut reels bağsız = genel). Saf mantık olmadığından doğrulama build + manuel.

**Tech Stack:** Next.js 16.2, Prisma 7.8 + Supabase, next-intl, React 19.

---

## File Structure
- `prisma/schema.prisma` — M2M relation.
- `lib/reels.ts` — `getGeneralReels`; `getReels` admin için products include.
- `lib/products.ts` — `getProductBySlug` reels include.
- `components/admin/ProductForm.tsx` — reels çoklu seçim.
- `app/[locale]/admin/urunler/actions.ts` — `reelIds` → `reels.set`.
- `app/[locale]/admin/urunler/yeni/page.tsx`, `[id]/page.tsx` — allReels/selectedReelIds.
- `app/[locale]/admin/reels/page.tsx` + `actions.ts` — `setReelProducts` + ürün çoklu seçim.
- `app/[locale]/lezzetlerimiz/[slug]/page.tsx` — ürün reels şeridi.
- `app/[locale]/lezzetlerimiz/page.tsx`, `app/[locale]/page.tsx` — `getReels`→`getGeneralReels`.

---

## Task 1: Şema + Migration (M2M)

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: İlişki alanlarını ekle**

`Product` modeline (mevcut `orders Order[]` benzeri ilişki satırlarının yanına) ekle:
```prisma
  reels             Reel[]
```
`Reel` modeline ekle:
```prisma
  products  Product[]
```

- [ ] **Step 2: Migration**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name product_reels`
Expected: "Applying migration ...product_reels" + "✔ Generated Prisma Client". Implicit M2M için `_ProductToReel` tablosu oluşur. (P1001 → 3 kez dene; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 3: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): Product.reels <-> Reel.products M2M"
```

---

## Task 2: Okuma katmanı (getGeneralReels + include)

**Files:** Modify `lib/reels.ts`, `lib/products.ts`

- [ ] **Step 1: `lib/reels.ts`**

Mevcut içeriği şununla değiştir:
```ts
import { cache } from "react";
import { prisma } from "./prisma";

// Admin: tüm reels + bağlı ürün id'leri (ürün çoklu seçimini göstermek için)
export const getReels = cache(async () => {
  return prisma.reel.findMany({
    orderBy: { order: "asc" },
    include: { products: { select: { id: true } } },
  });
});

// Public ana sayfa/liste: yalnız hiçbir ürüne bağlı OLMAYAN ("genel") reels
export const getGeneralReels = cache(async () => {
  return prisma.reel.findMany({
    where: { products: { none: {} } },
    orderBy: { order: "asc" },
  });
});
```

- [ ] **Step 2: `lib/products.ts` — getProductBySlug include reels**

`getProductBySlug` içindeki `include` nesnesine `reels` ekle:
```ts
export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true, reels: { orderBy: { order: "asc" } } },
  });
});
```
(Mevcut `include: { category: true }` ise yukarıdaki gibi genişlet.)

- [ ] **Step 3: tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0 (gerekirse önce `npx prisma generate`).

- [ ] **Step 4: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/reels.ts lib/products.ts
git commit -m "feat: getGeneralReels + ürün detayına reels include"
```

---

## Task 3: Ana sayfa + liste → genel reels

**Files:** Modify `app/[locale]/page.tsx`, `app/[locale]/lezzetlerimiz/page.tsx`

- [ ] **Step 1: Ana sayfa**

`app/[locale]/page.tsx`:
- import'u değiştir: `import { getReels } from "@/lib/reels";` → `import { getGeneralReels } from "@/lib/reels";`
- `Promise.all` içindeki `getReels()` → `getGeneralReels()`.

- [ ] **Step 2: Liste sayfası**

`app/[locale]/lezzetlerimiz/page.tsx`:
- import: `getReels` → `getGeneralReels`.
- `Promise.all` içindeki `getReels()` → `getGeneralReels()`.

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/page.tsx" "app/[locale]/lezzetlerimiz/page.tsx"
git commit -m "feat: ana sayfa + liste genel (bağsız) reels gösterir"
```

---

## Task 4: Ürün detayında ürünün reels'i

**Files:** Modify `app/[locale]/lezzetlerimiz/[slug]/page.tsx`

- [ ] **Step 1: ReelsStrip ekle**

`app/[locale]/lezzetlerimiz/[slug]/page.tsx`:
- import ekle:
```ts
import { ReelsStrip } from "@/components/public/ReelsStrip";
import { getTranslations } from "next-intl/server";
```
(getTranslations zaten varsa tekrar ekleme.)
- Sayfa gövdesinde `product` alındıktan sonra reels başlığı için: `const tm = await getTranslations("menu");`
- `product.reels` tipi: `getProductBySlug` artık `reels` döndürüyor. JSX'te, mevcut `İçindekiler` bölümünün KAPANIŞINDAN sonra (ürün detay `</div>` veya section içinde uygun yerde) ekle:
```tsx
        {product.reels && product.reels.length > 0 && (
          <ReelsStrip
            reels={product.reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl, videoUrl: r.videoUrl, instagramUrl: r.instagramUrl }))}
            locale={loc}
            heading={tm("reelsHeading")}
          />
        )}
```
Not: `product.reels` TypeScript'te bilinmiyorsa `(product as { reels?: { id:string; title:unknown; coverUrl:string; videoUrl:string|null; instagramUrl:string|null }[] }).reels` yerine, `getProductBySlug` include sayesinde tip otomatik gelir; gelmezse `const reels = (product.reels ?? [])` ile yerel değişken kullan.
- Yerleşim: ReelsStrip kendi `<section>`'ı olduğu için ana grid'in DIŞINA, sayfanın en altına koymak en temizi. Sayfa `return ( <section>...</section> )` ise fragment'e al:
```tsx
  return (
    <>
      <section ...>{/* mevcut detay içeriği */}</section>
      {product.reels && product.reels.length > 0 && (
        <ReelsStrip reels={...} locale={loc} heading={tm("reelsHeading")} />
      )}
    </>
  );
```

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/lezzetlerimiz/[slug]/page.tsx"
git commit -m "feat: ürün detayında o ürüne bağlı reels şeridi"
```

---

## Task 5: Ürün formundan reel seçimi

**Files:** Modify `components/admin/ProductForm.tsx`, `app/[locale]/admin/urunler/actions.ts`, `app/[locale]/admin/urunler/yeni/page.tsx`, `app/[locale]/admin/urunler/[id]/page.tsx`

- [ ] **Step 1: ProductForm — reels çoklu seçim**

`components/admin/ProductForm.tsx`:
- Bileşen prop tipine ekle:
```tsx
type ReelLite = { id: string; title: Record<string, string> | null; coverUrl: string };
```
ve `ProductForm` parametrelerine `allReels = [], selectedReelIds = []` ekle (imza: `{ action, categories, product, allReels, selectedReelIds }` ve tip olarak `allReels?: ReelLite[]; selectedReelIds?: string[];`).
- `<SubmitButton />`'dan ÖNCE ekle:
```tsx
      {allReels.length > 0 && (
        <>
          <div className="gold-divider my-1" />
          <h2 className="font-serif text-gold">Bu ürüne ait Reels</h2>
          <div className="flex flex-wrap gap-3">
            {allReels.map((r) => (
              <label key={r.id} className="flex w-32 cursor-pointer flex-col gap-1 text-xs text-cream/80">
                <span className="relative block aspect-[9/16] overflow-hidden rounded-lg border border-copper/30 bg-forest">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.coverUrl && <img src={r.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="reelIds" value={r.id} defaultChecked={selectedReelIds.includes(r.id)} />
                  <span className="truncate">{r.title?.tr || "—"}</span>
                </span>
              </label>
            ))}
          </div>
        </>
      )}
```

- [ ] **Step 2: actions — reelIds → reels.set**

`app/[locale]/admin/urunler/actions.ts`:
- `createProduct` ve `updateProduct`'ın `data` nesnelerine ekle (ikisine de, `portions` satırının yanına):
```ts
      reels: { set: (formData.getAll("reelIds") as string[]).filter(Boolean).map((id) => ({ id })) },
```

- [ ] **Step 3: yeni sayfa — allReels geçir**

`app/[locale]/admin/urunler/yeni/page.tsx`:
- import: `import { getReels } from "@/lib/reels";`
- `const categories = await getCategories();` yanına `const reels = await getReels();`
- `<ProductForm action={createProduct} categories={categories} />` → `<ProductForm action={createProduct} categories={categories} allReels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl }))} selectedReelIds={[]} />`

- [ ] **Step 4: düzenle sayfası — allReels + selectedReelIds**

`app/[locale]/admin/urunler/[id]/page.tsx`:
- import: `import { getReels } from "@/lib/reels";`
- Ürün sorgusuna reels ilişkisini ekle: `prisma.product.findUnique`'a `include: { reels: { select: { id: true } } }` ekle (varsa mevcut include'a kat). Ayrıca `const reels = await getReels();` çek (Promise.all'a ekleyebilirsin).
- `<ProductForm ... product={{...}} />`'a ekle:
```tsx
        allReels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl }))}
        selectedReelIds={(product.reels ?? []).map((r) => r.id)}
```

- [ ] **Step 5: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/admin/ProductForm.tsx "app/[locale]/admin/urunler/actions.ts" "app/[locale]/admin/urunler/yeni/page.tsx" "app/[locale]/admin/urunler/[id]/page.tsx"
git commit -m "feat(admin): ürün formundan reel seçimi (M2M set)"
```

---

## Task 6: Reels sayfasından ürün seçimi

**Files:** Modify `app/[locale]/admin/reels/actions.ts`, `app/[locale]/admin/reels/page.tsx`

- [ ] **Step 1: setReelProducts action**

`app/[locale]/admin/reels/actions.ts` SONUNA ekle:
```ts
export async function setReelProducts(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const productIds = (formData.getAll("productIds") as string[]).filter(Boolean);
  await prisma.reel.update({
    where: { id },
    data: { products: { set: productIds.map((pid) => ({ id: pid })) } },
  });
  revalidatePath("/admin/reels");
  revalidatePath("/admin/urunler");
}
```

- [ ] **Step 2: Reels sayfasına ürün çoklu seçim**

`app/[locale]/admin/reels/page.tsx`:
- import ekle: `import { getProducts } from "@/lib/products";` ve action import'una `setReelProducts` ekle.
- `const reels = await getReels();` yanına `const products = await getProducts();`
- Her reel `<li>`'sinde, "Sil" formundan önce ekle:
```tsx
            <form action={setReelProducts} className="flex flex-col gap-1">
              <input type="hidden" name="id" value={r.id} />
              <span className="text-xs text-cream/60">Görüneceği ürünler:</span>
              <div className="max-h-28 overflow-y-auto rounded border border-copper/20 p-1">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-1 text-xs text-cream/80">
                    <input type="checkbox" name="productIds" value={p.id}
                      defaultChecked={(r.products ?? []).some((rp) => rp.id === p.id)} />
                    <span className="truncate">{(p.title as Record<string, string>)?.tr || "—"}</span>
                  </label>
                ))}
              </div>
              <button className="rounded bg-gold/20 px-2 py-1 text-xs text-gold">Ürünleri Kaydet</button>
            </form>
```
(Reel kartının genişliği `w-44` → ihtiyaca göre `w-56` yapılabilir; `r.products` artık getReels include'undan geliyor.)

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/reels/actions.ts" "app/[locale]/admin/reels/page.tsx"
git commit -m "feat(admin): reels sayfasından ürün seçimi (M2M set)"
```

---

## Task 7: Tam doğrulama + build + deploy

- [ ] **Step 1: testler + tsc + build**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error" | head`
Expected: testler PASS; tsc Exit 0; build başarılı.

- [ ] **Step 2: Manuel önizleme**
Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Admin > Reels: bir reel ekle. Admin > Ürünler > bir ürünü düzenle → "Bu ürüne ait Reels"ten o reel'i işaretle, kaydet.
- O ürünün detay sayfası → reel şeridi görünür. Başka ürün detayında ve ana sayfada görünmez (artık bağlı).
- Ürün formundan işareti kaldır → reel ana sayfaya/listeye geri döner.
- Reels sayfasından bir reel'e ürün(ler) ata → aynı sonuç (iki yön tutarlı).
- Bağsız eski reels: ana sayfa + liste + üründe değil — eskisi gibi genel (regresyon yok).

- [ ] **Step 3: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`.)

---

## Self-Review Notları
- **Spec kapsamı:** M2M model (T1), getGeneralReels + detay include (T2), ana sayfa/liste genel (T3), detay ürün reels (T4), ürün formundan yönetim (T5), reels sayfasından yönetim (T6), doğrulama (T7). Tümü karşılandı.
- **Tip tutarlılığı:** `ReelLite` (id/title/coverUrl) ProductForm'da tanımlı, yeni+düzenle sayfaları aynı şekli besliyor. `reels: { set: [{id}] }` ve `products: { set: [{id}] }` Prisma M2M `set` deseni. getReels artık `products` include ediyor → reels sayfası `r.products` kullanır.
- **Geriye uyum:** Bağsız reels `products: { none: {} }` ile genel; mevcut reels etkilenmez. Tüm yeni alanlar ilişki (additive migration).
- **Placeholder yok:** Tüm adımlar tam kod / kesin edit.
