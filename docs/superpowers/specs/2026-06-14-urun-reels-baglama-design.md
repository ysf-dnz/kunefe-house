# Reels-Ürün Bağlama — Tasarım

**Tarih:** 2026-06-14
**Kapsam:** Reel'leri ürünlere many-to-many bağlama. Ürün detayında o ürüne bağlı reels gösterilir; ana sayfa + ürün liste sayfası yalnız "genel" (hiçbir ürüne bağlı olmayan) reels'i gösterir. Admin'de bağlantı hem ürün formundan hem reels sayfasından yönetilir.
**Önkoşul:** Reel modeli (id, title Json, coverUrl, videoUrl, instagramUrl, order) + ReelsStrip + /admin/reels + ürün katalog/detay canlıda.

---

## 1. İlkeler
- **Additive & geriye uyumlu:** Implicit M2M ara tablosu eklenir; mevcut reels'in bağlantısı yok → "genel" sayılır, eskisi gibi ana sayfada/listede görünür.
- **Tek ilişki, iki düzenleme noktası:** Aynı M2M hem ürün formundan hem reels sayfasından `set` ile düzenlenir.
- **Mevcut desenler:** Prisma include, server action + guard, ImageUpload/LocalizedInput, cache'li okuma.

## 2. Veri Modeli
Prisma **implicit many-to-many**:
```prisma
model Product {
  // ...mevcut alanlar
  reels     Reel[]
}
model Reel {
  // ...mevcut alanlar
  products  Product[]
}
```
Prisma otomatik `_ProductToReel` ara tablosu üretir. Migration **additive** (mevcut satırları etkilemez).

## 3. Public Gösterim
- **Ürün detayı** (`app/[locale]/lezzetlerimiz/[slug]/page.tsx`): `getProductBySlug` `include: { reels: { orderBy: { order: "asc" } } }`. Ürünün reels'i varsa sayfada (içindekiler'den sonra) `ReelsStrip` ile gösterilir; yoksa şerit render edilmez.
- **Ana sayfa** (`app/[locale]/page.tsx`) ve **ürün liste** (`app/[locale]/lezzetlerimiz/page.tsx`): yeni `getGeneralReels()` — yalnız hiçbir ürüne bağlı OLMAYAN reels (`where: { products: { none: {} } }`). Mevcut `getReels()` çağrıları bu ikisinde `getGeneralReels()` ile değişir.
- Başlık: mevcut `menu.reelsHeading` ("Mutfaktan Kareler") kullanılır (ürün detayında da aynı başlık).

## 4. Admin
### 4.1 Ürün formu (`components/admin/ProductForm.tsx`)
- Yeni bölüm: "Bu ürüne ait Reels" — tüm reels listesinden çoklu seçim (checkbox listesi; her reel kapak küçük görsel + başlık TR).
- Form, seçili reel id'lerini gizli/checkbox `name="reelIds"` (çoklu) olarak gönderir.
- ProductForm `allReels` (id + title + coverUrl) ve `selectedReelIds` proplarını alır.

### 4.2 Ürün action (`app/[locale]/admin/urunler/actions.ts`)
- `create/updateProduct`: `formData.getAll("reelIds")` → `reels: { set: ids.map(id => ({ id })) }`.

### 4.3 Ürün ekle/düzenle sayfaları
- `urunler/yeni/page.tsx` + `urunler/[id]/page.tsx`: `getReels()` (hepsi) çekip ProductForm'a `allReels` geçer; düzenlemede ürünün mevcut `reels` id'leri `selectedReelIds`.

### 4.4 Reels sayfası (`app/[locale]/admin/reels/page.tsx` + actions)
- Her reel satırına "Görüneceği ürünler" çoklu seçim (ürün listesi). Yeni action `setReelProducts(formData)` → `prisma.reel.update({ where:{id}, data:{ products: { set: ids.map(id=>({id})) } } })`.
- Sayfa `getProducts()` (id + title) çeker; her reel'in mevcut bağlı ürünleri seçili gösterilir.

## 5. Okuma Katmanı (`lib/reels.ts`, `lib/products.ts`)
- `lib/reels.ts`: yeni `getGeneralReels = cache(() => prisma.reel.findMany({ where: { products: { none: {} } }, orderBy: { order: "asc" } }))`. Mevcut `getReels` (hepsi) korunur (admin için).
- `lib/products.ts`: `getProductBySlug` include'una `reels: { orderBy: { order: "asc" } }` eklenir. Admin reels sayfası için gerekiyorsa `getProducts` zaten var.

## 6. Güvenlik / Sağlamlık
- Tüm admin action'ları `guard()` (mevcut). `reelIds`/`productIds` yalnız var olan id'lere `set` (geçersiz id Prisma'da hata → admin görür; `connect` yerine `set` ile tam liste değişimi).
- Public okuma yalnız gerekli alanları seçer; Decimal yok (reels'te fiyat yok).
- M2M `set` ilişkiyi tümüyle değiştirir (eksik/çift bağ olmaz).

## 7. Dosya Etki Haritası
**Değişecek:**
- `prisma/schema.prisma` — Product.reels + Reel.products (implicit M2M) + migration.
- `lib/reels.ts` — `getGeneralReels`.
- `lib/products.ts` — `getProductBySlug` include reels.
- `components/admin/ProductForm.tsx` — reels çoklu seçim (`allReels`, `selectedReelIds`).
- `app/[locale]/admin/urunler/actions.ts` — `reelIds` → `reels.set`.
- `app/[locale]/admin/urunler/yeni/page.tsx`, `[id]/page.tsx` — allReels/selectedReelIds geçir.
- `app/[locale]/admin/reels/page.tsx` + `actions.ts` — `setReelProducts` + ürün çoklu seçim.
- `app/[locale]/lezzetlerimiz/[slug]/page.tsx` — ürün reels'ini ReelsStrip ile göster.
- `app/[locale]/lezzetlerimiz/page.tsx` + `app/[locale]/page.tsx` — `getReels` → `getGeneralReels`.

## 8. Test / Doğrulama
- Reel'i bir ürüne bağla → o ürün detayında görünür; ana sayfada/listede ve başka üründe görünmez.
- Bağlantıyı kaldır → reel genel havuza döner, ana sayfada/listede tekrar görünür.
- Bir reel'i çok ürüne bağla → hepsinde görünür.
- Her iki yönden (ürün formu / reels sayfası) düzenleme aynı sonucu verir.
- Bağsız eski reels: ana sayfa/listede görünür (regresyon yok).
- `tsc --noEmit` + `vitest run` + `next build` temiz; 3 dil bozulmaz.
