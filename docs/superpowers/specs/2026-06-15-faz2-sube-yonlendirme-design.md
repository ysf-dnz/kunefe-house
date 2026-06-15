# Faz 2 — Şube Yönlendirme + Public Şube Menüsü — Tasarım

**Tarih:** 2026-06-15
**Kapsam:** Müşteri üst bardan şube seçer (veya "en yakını" konumdan); seçim cookie'de. Public katalog (liste + detay) seçili şubenin efektif menüsünü gösterir (BranchProduct override: var/yok + stok + yerel ₺). Sipariş seçili şubeye düşer (Order.branchId).
**Yol haritası:** Faz 2. Önkoşul: Faz 0 (Branch kiracı + lat/lng + Order.branchId) + Faz 1 (getBranchMenu/effectiveProduct) canlıda.
**Kapsam dışı:** Porsiyon-bazlı şube fiyatı (Faz 1 yalnız ürün ₺ override) — porsiyon/USD/QAR merkezî. E-ticaret/kargo (Faz 3). HQ raporlama (Faz 4).

---

## 1. İlkeler
- **Rahatsız etmeyen seçim:** Şube seçilene kadar merkez katalog (bugünkü davranış). Seçim cookie'de kalıcı.
- **Tükendi gizlenmez:** Kapalı/stok-0 ürün "Tükendi" rozetiyle görünür (marka yelpazesi korunur), sipariş edilemez.
- **Geriye uyumlu:** Şubesiz/seçimsiz akış aynen çalışır; sipariş branchId null → HQ atar.
- **Güvenli:** cookie branchId server'da doğrulanır (aktif şube mi); değilse yok sayılır.

## 2. Şube Seçimi
### 2.1 `lib/branch-select.ts`
- `nearestBranch(lat, lng, branches)` (saf, TDD): lat/lng'si olan aktif şubeler arasında haversine ile en yakını döner; aday yoksa null.
- `getSelectedBranch()` (server): `cookies()` → `kh_branch` id; aktif Branch'e çözer (yoksa/pasifse null).
- `getActiveBranches()` (cache): `isActive: true`, order'a göre.

### 2.2 `setBranch` action (`app/[locale]/branch-actions.ts`)
- `setBranch(branchId | null)`: branchId geçerli aktif şube ise `kh_branch` cookie'sine yazar (1 yıl, httpOnly=false gerekmez; path /), null ise siler. `revalidatePath("/", "layout")`.
- `setNearestBranch(lat, lng)`: `nearestBranch` ile bulur, cookie yazar, bulunan şube adını döner.

### 2.3 `BranchPicker` (client, üst barda)
- Props: `branches` (aktif: id, name), `selectedId`.
- Görünüm: seçili şube adı (yoksa "Şube seç") → tıklayınca açılır liste (şubeler + "Merkez/Genel" = şube yok seçeneği) + **"📍 Bana en yakını"** butonu (geolocation → `setNearestBranch`).
- Seçim → `setBranch` → router.refresh(). 1 şubeden az aktif şube varsa picker gizli/sade.
- Header (HeaderClient) içine yerleştirilir (LanguageSwitcher yanına).

## 3. Public Menü (şube-duyarlı)
### 3.1 Liste (`/lezzetlerimiz`)
- `getSelectedBranch()`; şube varsa `getBranchMenu(branch.id)` → her ürün için `effectiveProduct(central, override)`; şube yoksa mevcut `getProducts()` (merkez).
- ProductCard'a efektif `available` + efektif ₺ `price` geçirilir. Kapalıysa kart "Tükendi" rozeti + tıklanabilir ama detayda sipariş kapalı.

### 3.2 ProductCard
- Yeni opsiyonel prop'lar: `soldOut?: boolean`, `branchPrice?: number | null` (efektif ₺; verildiğinde tekil ₺ yerine kullanılır). `soldOut` ise gri "Tükendi" rozeti, fiyatın üstünde.

### 3.3 Detay (`/lezzetlerimiz/[slug]`)
- `getSelectedBranch()`; şube varsa o ürünün override'ı çözülür. Efektif ₺ fiyat OrderFlow'a `singlePrice` olarak geçer (yerel override varsa onu). Ürün kapalıysa (`!available`) OrderFlow yerine **"Bu şubede tükendi"** bloğu.
- (Porsiyon/USD/QAR merkezî kalır — Faz 1 sınırı.)

## 4. Sipariş
- `createOrder` (order-actions): `getSelectedBranch()` ile cookie şubesini okur → `branchId`. Seçili değilse null (HQ atar). Mevcut fiyat/locale mantığı korunur; şube ₺ override fiyatı zaten OrderFlow'dan gelen tutara yansır (mesaj bilgilendirme).

## 5. Dosya Etki Haritası
**Yeni:** `lib/branch-select.ts` + `tests/unit/branch-select.test.ts`; `app/[locale]/branch-actions.ts` (setBranch/setNearestBranch); `components/layout/BranchPicker.tsx` (client).
**Değişecek:** `components/layout/Header.tsx`/`HeaderClient.tsx` (BranchPicker yerleştir + aktif şubeleri geçir); `app/[locale]/lezzetlerimiz/page.tsx` (şube menüsü); `app/[locale]/lezzetlerimiz/[slug]/page.tsx` (efektif fiyat/uygunluk); `components/public/ProductCard.tsx` (soldOut/branchPrice); `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts` (branchId).

## 6. Test / Doğrulama
- `nearestBranch`: en yakını seçer; lat/lng'siz şubeleri atlar; aday yoksa null. (TDD)
- Şube seç → liste o şubenin efektif menüsünü gösterir; kapalı ürün "Tükendi"; yerel ₺ fiyat uygulanır.
- "Bana en yakını" → konumdan şube seçer (cookie).
- Sipariş → seçili şubeyle order.branchId dolu; admin siparişlerde o şube görünür. Şubesiz → null (HQ atar).
- Şube seçili değilken merkez katalog (regresyon yok). Geçersiz cookie → yok sayılır.
- `tsc` + `vitest` + `next build` temiz; 3 dil + Faz 0/1 regresyonsuz.
