# Çoklu Para Birimi + Ürün Reels + Header Fix — Tasarım

**Tarih:** 2026-06-14
**Kapsam:** (A) Dile göre para birimi — her ürün/porsiyon için ₺/$/ر.ق ayrı girilir; aktif dilin para birimi gösterilir, o dilin fiyatı girilmemişse fiyat **gizlenir**. (B) Ürün sayfası (`/lezzetlerimiz`) en altına Instagram Reels şeridi. (C) Üst bar (header) scroll titreşmesi düzeltmesi.
**Önkoşul:** Faz A fiyat/porsiyon + B1/B2 + C1 canlıda.

---

## 1. İlkeler

- **Doğruluk önce:** Sembol değiştirip aynı sayıyı göstermek yanlış olur. Bu yüzden her para birimi için **ayrı gerçek fiyat** girilir (kur çevirisi yok).
- **Eksikse gizle:** Bir ürünün aktif dildeki para birimi fiyatı yoksa, o dilde fiyat ve (varsa) indirim rozeti gösterilmez; ürün yine listelenir, sipariş/ETA akışı yine çalışır (fiyatsız).
- **Additive & geriye uyumlu:** Mevcut `price`/`oldPrice` = ₺ (TRY) kabul edilir; yeni para birimleri opsiyonel eklenir. Eski ürünler bozulmaz.
- **Para birimleri (sabit):** TR → TRY (₺), EN → USD ($), AR → QAR (ر.ق).

---

## 2. Bölüm A — Çoklu Para Birimi

### 2.1 Veri modeli

`Product`'a eklenecek (additive, hepsi nullable):
```prisma
  priceUsd      Decimal? @db.Decimal(10, 2)
  oldPriceUsd   Decimal? @db.Decimal(10, 2)
  priceQar      Decimal? @db.Decimal(10, 2)
  oldPriceQar   Decimal? @db.Decimal(10, 2)
```
`price`/`oldPrice` (mevcut) = **TR fiyatı (₺/TRY)**.

`Order`'a eklenecek: `currency String @default("TRY")` — müşterinin gördüğü para birimi kodu (admin'de doğru sembol için).

Porsiyon JSON tipi (`lib/portions.ts` `Portion`) genişler:
```ts
type Portion = {
  persons: number;
  price: number;        // TRY (mevcut)
  oldPrice?: number;
  usd?: number; oldUsd?: number;
  qar?: number; oldQar?: number;
};
```
`parsePortions` yeni alanları doğrular (pozitif; oldX > X değilse atılır). Eski kayıtlar (yalnız `price`) sorunsuz okunur — usd/qar undefined kalır.

### 2.2 Para birimi çözümü (`lib/currency.ts` — yeni, saf, TDD)

```ts
type CurrencyCode = "TRY" | "USD" | "QAR";
currencyForLocale(locale): CurrencyCode          // tr→TRY, en→USD, ar→QAR
// Bir ürün/porsiyonun aktif dildeki (fiyat, eskiFiyat) değerini seçer; yoksa null.
```
Seçim haritası:
- tr → `price`/`oldPrice` (porsiyon `price`/`oldPrice`)
- en → `priceUsd`/`oldPriceUsd` (porsiyon `usd`/`oldUsd`)
- ar → `priceQar`/`oldPriceQar` (porsiyon `qar`/`oldQar`)

### 2.3 `formatPrice` güncellemesi (`lib/price.ts`)

İmza değişir: `formatPrice(value, currency: CurrencyCode, locale?)` — `Intl.NumberFormat` `style:"currency"` + kod; sembol koddan gelir (₺/$/ر.ق). Tüm çağıranlar güncellenir (ProductCard, OrderFlow, siparisler sayfası, admin). `discountPercent` aynı kalır.

### 2.4 Admin — ProductForm

- Tekil fiyat bölümü 3 para birimi grubu olur: **₺** (price/oldPrice), **$** (priceUsd/oldPriceUsd), **ر.ق** (priceQar/oldPriceQar). Her grup: fiyat + eski fiyat.
- `PortionEditor` her satıra para birimi alanları ekler: ₺ (mevcut), $, ر.ق (+ opsiyonel eski). Okunabilirlik için satır içinde gruplanır (ör. para birimi etiketli üçlü).
- `showPrice` yine global açma/kapama.
- Yardımcı metin: "Bir dilin para birimini boş bırakırsan o dilde fiyat gösterilmez."

### 2.5 Admin actions

`createProduct`/`updateProduct`: yeni 4 alanı `parsePrice` ile okur. `parsePortions` genişletilmiş JSON'u işler.

### 2.6 Public gösterim

- **ProductCard:** aktif dilin para birimi fiyatı (porsiyonluysa o para birimindeki en düşük). Yoksa fiyat bloğu gizli.
- **OrderFlow (detay):** porsiyon seçicide her porsiyonun aktif-para-birimi fiyatı; yoksa fiyatsız (seçici yine çalışır). İndirim rozeti yalnız aktif para biriminde eski fiyat varsa.
- **Sipariş/ETA WhatsApp mesajları:** aktif dilin para birimi + değeriyle yazılır (yoksa "fiyat WhatsApp'tan teyit" — Faz A deseni).
- **`createOrder`:** sunucuda aktif para birimi + o para birimindeki porsiyon/ürün fiyatını yazar (`Order.price` + `Order.currency`).
- **Admin Siparişler:** `formatPrice(o.price, o.currency)`.

---

## 3. Bölüm B — Ürün Sayfası Reels Şeridi

`/lezzetlerimiz` sayfasının en altına, ana sayfadaki `ReelsStrip` bileşeni eklenir:
- `getReels()` ile veri çekilir; `<ReelsStrip reels={...} locale={loc} heading={...} />`.
- Başlık: ana sayfadakiyle aynı anahtar/üslup ("Mutfaktan Kareler" — mevcut). Reels yoksa bölüm render edilmez (ReelsStrip boşsa gizlenmeli — kontrol edilir).
- Inline oynatma zaten ReelsStrip'te mevcut; ek iş yok.

---

## 4. Bölüm C — Header Titreşme Düzeltmesi (UYGULANDI)

`HeaderClient` scroll eşiği histerezise çevrildi (açılma 48px / kapanma 8px), `passive` listener. Tek eşik + scroll'da header küçülmesi geri-besleme döngüsü yapıp titretiyordu. *(Bu değişiklik bu spec yazılırken zaten uygulandı; planda yalnız doğrulama adımı var.)*

---

## 5. Güvenlik / Sağlamlık

- Yeni fiyat alanları `parsePrice` ile doğrulanır (negatif/NaN → null). `Order.currency` yalnız "TRY"/"USD"/"QAR" değerlerinden biri (server doğrular; geçersizse "TRY").
- Decimal'ler client'a `toNumber` ile geçer (serileştirme güvenli).
- Eksik para birimi → gizleme mantığı hem kart hem detay hem mesajda tutarlı (`currency.ts` tek kaynak).

---

## 6. Dosya Etki Haritası

**Yeni:**
- `lib/currency.ts` + `tests/unit/currency.test.ts` — currencyForLocale + aktif fiyat seçimi (saf, TDD).

**Değişecek:**
- `prisma/schema.prisma` — Product 4 alan + Order.currency.
- `lib/price.ts` — `formatPrice(value, currency, locale?)`.
- `lib/portions.ts` — `Portion` tipi + `parsePortions` (usd/qar/old*).
- `components/admin/PortionEditor.tsx` — para birimi sütunları.
- `components/admin/ProductForm.tsx` — 3 para birimi fiyat grubu.
- `app/[locale]/admin/urunler/actions.ts` — yeni alanları oku/yaz.
- `app/[locale]/admin/urunler/[id]/page.tsx` — yeni alanları forma geçir.
- `components/public/ProductCard.tsx` — aktif para birimi gösterimi/gizleme.
- `components/public/OrderFlow.tsx` — porsiyon fiyatları aktif para birimi; mesaj para birimi.
- `app/[locale]/lezzetlerimiz/page.tsx` — kartlara para birimi verisi + **ReelsStrip** ekle.
- `app/[locale]/lezzetlerimiz/[slug]/page.tsx` — OrderFlow'a para birimi verisi.
- `lib/order-message.ts` — fiyat metni para birimiyle (priceText zaten dışarıdan geliyor; çağıran formatlar).
- `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts` — currency + doğru fiyat kaydı.
- `lib/orders.ts` / `app/[locale]/admin/siparisler/page.tsx` — currency ile format.
- `components/layout/HeaderClient.tsx` — (uygulandı) histerezis.

---

## 7. Test / Doğrulama

- `lib/currency.ts`: locale→currency; aktif fiyat seçimi (var/yok → null); TDD.
- `lib/price.ts`: formatPrice TRY/USD/QAR sembolleri.
- `lib/portions.ts`: genişletilmiş parse (usd/qar dahil, eksik alan toleransı).
- Admin: ürüne ₺/$/ر.ق gir; birini boş bırak → o dilde fiyat gizli, dolu dillerde görünür.
- Public: dil değiştir → fiyat o para biriminde; eksikse gizli; porsiyon seçimi fiyatı günceller.
- Sipariş: EN'de sipariş → WhatsApp mesajı $ ile; admin siparişte $ görünür.
- Ürün sayfası altında reels oynar.
- Header: scroll'da titreşme yok.
- `tsc` + `vitest` + `next build` temiz; eski ürünler (yalnız ₺) regresyon yok.
