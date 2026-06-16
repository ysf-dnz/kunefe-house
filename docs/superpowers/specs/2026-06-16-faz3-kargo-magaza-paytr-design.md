# Faz 3 — Kargo Mağazası (Sepet + PayTR + WhatsApp Takip) — Tasarım

**Tarih:** 2026-06-16
**Kapsam:** Tüm Türkiye'ye kargoyla ürün satışı: ayrı kargo kataloğu (`/magaza`), çok ürünlü sepet, PayTR güvenli iFrame ile online ödeme, ödenmiş siparişlerin merkez (HQ) tarafından kargolanması ve müşteriye WhatsApp ile takip no iletimi. Basit merkezi stok takibi.
**Yol haritası:** Faz 3 (e-ticaret). Önkoşul: Faz 0–5 canlıda (deploy düzeldi). Dış bağımlılık: PayTR mağaza hesabı (kullanıcıda mevcut).
**Kapsam dışı:** Müşteri üyeliği/hesap, otomatik kargo firması API entegrasyonu (takip no manuel girilir), iade/kupon/çoklu para birimi (yalnız ₺), şube bazlı kargo (yalnız HQ).

---

## 1. İlkeler
- **Ayrı kargo ürünleri:** Yalnız `cargoAvailable` işaretli ürünler `/magaza`'da. Taze yerel menü (Lezzetlerimiz) ve yerel WhatsApp sipariş akışı (`OrderFlow`) dokunulmaz.
- **Yalnız merkez (HQ):** Tüm kargo siparişleri merkeze düşer; HQ hazırlar, kargolar, takip no girer. Şubeler kargo satmaz.
- **Yalnız ₺ (TRY):** PayTR Türkiye içi. UI metinleri yine tr/en/ar çevrili; fiyat/ödeme ₺.
- **Üyelik yok:** Misafir alışveriş; sepet client-side (localStorage).
- **Güvenlik (kritik):**
  - Ödeme tutarı **her zaman sunucuda DB fiyatlarından** yeniden hesaplanır; istemciden gelen tutara asla güvenilmez.
  - Sipariş **yalnız PayTR webhook'unun hash doğrulamasıyla** `paid` olur — müşteri yönlendirmesiyle değil. Webhook idempotent.
  - Checkout endpoint rate-limit'li (mevcut `lib/ratelimit`).
  - PayTR callback `/api/paytr/callback` Node runtime (edge değil), Prisma kullanır.

## 2. Veri Modeli (Prisma — additive migration)
- **Product** ekle:
  - `cargoAvailable Boolean @default(false)` — mağazada görünür.
  - `cargoStock Int?` — merkez stoğu. `null` = takipsiz (sınırsız); sayı = takip edilir, ödenince düşer, 0 = Tükendi.
  - (Kargo fiyatı = mevcut `price` ₺ alanı; ayrı alan yok.)
- **SiteSettings** ekle:
  - `cargoEnabled Boolean @default(false)` — mağaza tümden açık/kapalı.
  - `shippingFee Decimal? @db.Decimal(10,2)` — sabit kargo ücreti (₺).
  - `freeShippingThreshold Decimal? @db.Decimal(10,2)` — bu tutar üstü kargo bedava (null = eşik yok).
- **Yeni `ShopOrder`:**
  - `id`, `merchantOid String @unique` (PayTR sipariş no), `status String @default("pending_payment")` — değerler: `pending_payment → paid → shipped → delivered | cancelled`.
  - Müşteri: `customerName`, `customerPhone`, `customerEmail`.
  - Adres: `addressCity`, `addressDistrict`, `addressFull`, `addressPostal?`.
  - Tutar: `subtotal`, `shippingFee`, `total` (hepsi `Decimal(10,2)`), `currency String @default("TRY")`.
  - Ödeme: `paytrStatus String?` (PayTR'dan dönen ham durum), `paidAt DateTime?`.
  - Kargo: `trackingNo String?`, `carrier String?`, `shippedAt DateTime?`.
  - `branchId String?` (HQ/Merkez), `branch` relation; `items ShopOrderItem[]`; `createdAt`.
- **Yeni `ShopOrderItem`:** `id`, `shopOrderId`+relation (onDelete: Cascade), `productId String?` (+relation SetNull), `title String` (kopya), `unitPrice Decimal(10,2)`, `qty Int`, `lineTotal Decimal(10,2)`.

## 3. PayTR Entegrasyonu (`lib/paytr.ts` — saf fonksiyonlar → TDD)
- `buildPaytrToken(params)` — iFrame token isteği için `paytr_token` hash'i üretir (HMAC-SHA256, base64; merchant_id+user_ip+merchant_oid+email+payment_amount+user_basket+no_installment+max_installment+currency+test_mode + merchant_salt, merchant_key ile). Net body döndürür (fetch çağrısı action'da).
- `verifyPaytrCallback(post, key, salt)` — callback'te `hash = HMAC(merchant_oid+merchant_salt+status+total_amount, key)` hesaplar, gelen `hash` ile sabit-zamanlı karşılaştırır → bool.
- `buildBasket(items)` — PayTR `user_basket` formatı (base64 JSON: `[[ad, fiyat, adet], ...]`).
- TDD: bilinen girdilerle hash deterministik; yanlış hash reddedilir; basket base64 doğru.
- Env: `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT` (Vercel'e kullanıcı ekler). Yoksa mağaza kapalı davranır (fail-safe).

## 4. Sepet (`lib/cart.ts` + `components/shop/CartProvider.tsx`)
- Client context + localStorage (`kh_cart`): `{ productId, title, price, qty, imageUrl }[]`.
- API: `add(item)`, `setQty(id, n)`, `remove(id)`, `clear()`, `count`, `subtotal`.
- Header'a sepet ikonu + adet rozeti (yalnız `cargoEnabled` ise).

## 5. Müşteri Akışı & Sayfalar
1. **`/[locale]/magaza`** — kargo kataloğu (`cargoAvailable && (cargoStock>0 || null)`); ürün kartı + "Sepete Ekle"; stok 0 → "Tükendi" pasif.
2. **`/[locale]/sepet`** — kalemler, adet değiştir/sil, ara toplam + kargo (eşik mantığı) + toplam, "Ödemeye Geç".
3. **`/[locale]/odeme`** — ad/tel/e-posta + adres formu (il/ilçe/açık adres/posta kodu). "Ödemeye geç" → server action:
   - Sepeti DB fiyatlarıyla doğrula + **stok kontrolü** (yetersizse hata), kargo ücretini hesapla, `ShopOrder`(pending_payment, merchantOid) + items oluştur.
   - PayTR token API'sini sunucuda çağır → iFrame token → sayfada **PayTR iFrame** göster.
4. Müşteri kartla öder → PayTR `/api/paytr/callback`'e POST → hash doğrula → **`$transaction`:** status=paid, paidAt, **takipli ürünlerde `cargoStock` düş** (negatife düşürmeden). Idempotent (zaten paid ise `OK` dön). PayTR'a düz `OK` yanıtı.
5. PayTR müşteriyi **`/[locale]/odeme/sonuc`**'a yönlendirir (success/fail). Başarıda sepet temizlenir, sipariş özeti + "kargoya verilince WhatsApp ile takip no gelecek" mesajı.

## 6. WhatsApp Kargo Takibi (onaylanan akış)
- **`/[locale]/admin/kargo-siparisler`** (HQ-only, `requireHQ`): ödenmiş siparişler listesi + detay.
- Detayda: **takip no + kargo firması** (select: Yurtiçi/Aras/MNG/PTT/Sürat) gir → kaydet (status=shipped, shippedAt) → **"Müşteriye WhatsApp Gönder"** butonu: `wa.me/<tel>` linki, takip no + firma takip URL'si içeren çok dilli mesajla açılır (mevcut kurye WhatsApp deseni). Teslim edildi işaretle (delivered).

## 7. Admin Diğer
- **ProductForm**: `cargoAvailable` checkbox + `cargoStock` sayı alanı (boş = sınırsız). Sidebar'a **Kargo Siparişleri** (HQ).
- **Ayarlar**: kargo bölümü — `cargoEnabled`, `shippingFee`, `freeShippingThreshold`.

## 8. Kod Yapısı / Dosya Etki Haritası
**Yeni:** `lib/paytr.ts` + `tests/unit/paytr.test.ts`; `lib/cart.ts`; `lib/shop.ts` (createShopOrder + sunucu fiyat/stok doğrulama, getShopOrders, markShipped); `components/shop/CartProvider.tsx`, `CartIcon`, `AddToCartButton`, `PaytrFrame`; sayfalar `magaza/`, `sepet/`, `odeme/`, `odeme/sonuc/`; `app/api/paytr/callback/route.ts`; `app/[locale]/admin/kargo-siparisler/{page,actions}.tsx`; mesaj `lib/cargo-message.ts`.
**Değişecek:** `prisma/schema.prisma` (+migration); `components/admin/ProductForm.tsx` + ürün actions; `app/[locale]/admin/ayarlar/{page,actions}`; `app/[locale]/admin/layout.tsx` (Kargo Siparişleri linki); header (sepet ikonu); i18n mesajları (tr/en/ar: `shop`, `cart`, `checkout`, `cargoAdmin` namespace'leri).

## 9. Güvenlik / Sağlamlık Özeti
- Tutar sunucuda; webhook hash + idempotent; rate-limit; stok düşümü `$transaction` içinde negatife düşmeden; merchantOid unique; PayTR env yoksa mağaza kapalı (fail-safe); callback Node runtime (Prisma edge'e girmez — Faz 0 dersi).

## 10. Test / Doğrulama
- `lib/paytr.ts`: hash determinizm, yanlış hash reddi, basket base64 (TDD).
- Mağaza: yalnız cargoAvailable+stoklu ürünler; sepet adet/sil/toplam; kargo eşiği; checkout DB fiyat doğrulama (istemci tutarı manipülasyonu işe yaramaz); stok 0 → checkout reddi.
- Webhook: doğru hash → paid + stok düşer + idempotent; yanlış hash → reddedilir, sipariş pending kalır.
- Admin: HQ kargo-siparisler görür, şube yöneticisi göremez (requireHQ); takip no → shipped + WhatsApp linki doğru.
- `tsc` + `vitest` + temiz `next build` + Vercel deploy yeşil; mevcut yerel sipariş akışı regresyonsuz.
