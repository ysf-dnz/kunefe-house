# Faz 1 — Katalog + Stok (Çok Şubeli) — Tasarım

**Tarih:** 2026-06-15
**Kapsam:** Merkezî katalog (HQ) + şube override'ı. Yeni `BranchProduct` (seyrek override: var/yok, stok, yerel ₺ fiyat). Şube yöneticisi kendi şubesinin menü/stok/yerel fiyatını yönetir. Efektif çözümleme yardımcısı (TDD).
**Yol haritası:** docs/.../2026-06-15-cok-subeli-platform-yol-haritasi.md (Faz 1).
**Kapsam dışı:** Public şube-bazlı menü gösterimi (Faz 2 — şube seçimi/yönlendirme). USD/QAR yerel override (yalnız ₺). Otomatik stok düşümü (sonraki iyileştirme). HQ'nun şube stoğunu yönetmesi (şubeler self-yönetir; HQ genel görünüm Faz 4).

---

## 1. İlkeler
- **Seyrek override:** `BranchProduct` satırı yalnız şube bir ürünü özelleştirince oluşur. Satır yoksa ürün o şubede **açık**, **merkez fiyatıyla**, **stok sınırsız**.
- **Merkez kontrolü:** Katalog (Product) HQ'da kalır; şube ürün ekleyemez/silemez, yalnız var/yok + stok + yerel ₺ fiyat ayarlar.
- **Tenant izolasyonu:** Şube admin yalnız kendi `branchId` override'larını yazar (Faz 0 deseni; upsert branchId = me.branchId).
- **Additive & geriye uyumlu:** Yeni tablo; mevcut katalog/sipariş akışı değişmez. Public Faz 1'de aynı kalır.

## 2. Veri Modeli
```prisma
model BranchProduct {
  id         String   @id @default(cuid())
  branchId   String
  branch     Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  available  Boolean  @default(true)
  stock      Int?                       // null = sınırsız; 0 = tükendi
  localPrice Decimal? @db.Decimal(10, 2) // ₺ override; null = merkez fiyatı
  updatedAt  DateTime @updatedAt

  @@unique([branchId, productId])
}
```
`Branch` ve `Product` modellerine ters ilişki: `branchProducts BranchProduct[]`. Migration additive.

## 3. Çözümleme Mantığı (`lib/branch-catalog.ts` — saf + okuma)
Saf fonksiyon (TDD):
```ts
type Override = { available: boolean; stock: number | null; localPrice: number | null } | null;
type Central = { price: number | null }; // ₺ merkez fiyatı (Product.price)
effectiveProduct(central: Central, override: Override): {
  available: boolean;   // override?.available ?? true; stock===0 ise false
  stock: number | null; // override?.stock ?? null
  price: number | null; // override?.localPrice ?? central.price (₺)
}
```
- `available` = (override yoksa true; varsa override.available) **ve** (stock !== 0).
- `price` (₺) = override.localPrice ?? central.price. (USD/QAR Product'tan; bu faz yalnız ₺ override.)

Okuma:
```ts
getBranchMenu(branchId): Promise<Array<{ product: Product; effective: {...} }>>
```
Tüm katalog + o şubenin override'ları (map ile birleştir). Faz 2 public + şube admin bunu kullanır.

## 4. Admin — Şube Menü/Stok (`/admin/menu`, yalnız BRANCH_ADMIN)
- `requireAdmin()`; role BRANCH_ADMIN değilse /admin'e (HQ buraya girmez — HQ katalogu /admin/urunler'den yönetir).
- Katalogdaki tüm ürünler listelenir; her satır: ürün adı (TR) + **açık/kapalı** checkbox + **stok** number input + **yerel ₺ fiyat** input (placeholder = merkez fiyatı).
- Her satır kendi mini `<form>` → `saveBranchProduct` action: `branchId = me.branchId`, productId, available, stock, localPrice'ı upsert eder. Üçü de varsayılansa (available=true, stock boş, localPrice boş) satır **silinir** (seyrek kalır).
- Sidebar: BRANCH_ADMIN için "Menü / Stok" linki (`app/[locale]/admin/layout.tsx`).

## 5. Güvenlik / Sağlamlık
- `saveBranchProduct`: `const me = await requireAdmin()`; `me.role !== "BRANCH_ADMIN" || !me.branchId` ise reddet. branchId her zaman me.branchId (formdan ALINMAZ) → IDOR yok.
- stock/localPrice parse: negatif/NaN → null; stock tamsayıya yuvarlanır.
- Decimal'ler `toNumber` ile client'a; `formatPrice(..., "TRY")` ile gösterim.

## 6. Dosya Etki Haritası
**Yeni:** `lib/branch-catalog.ts` + `tests/unit/branch-catalog.test.ts`; `app/[locale]/admin/menu/page.tsx` + `actions.ts`; `components/admin/BranchProductRow.tsx` (client, satır formu).
**Değişecek:** `prisma/schema.prisma` (BranchProduct + ters ilişkiler); `app/[locale]/admin/layout.tsx` (BRANCH_ADMIN "Menü / Stok" linki).

## 7. Test / Doğrulama
- `effectiveProduct`: override yok → açık+merkez fiyat; available=false → kapalı; stock=0 → kapalı; localPrice dolu → ₺ ezilir. (TDD)
- Şube admin /admin/menu: ürün kapat → satır oluşur; stok/fiyat gir → upsert; varsayılana döndür → satır silinir.
- IDOR: şube admin başka şubeye yazamaz (branchId me.branchId zorlanır).
- HQ /admin/menu'ye girince /admin'e atılır.
- `tsc` + `vitest` + `next build` temiz; public + Faz 0 regresyonsuz.
