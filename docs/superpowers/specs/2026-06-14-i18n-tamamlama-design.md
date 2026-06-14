# i18n Tamamlama — Tasarım

**Tarih:** 2026-06-14
**Kapsam:** Public yüzeydeki kod-gömülü Türkçe sabit metinleri + sayfa SEO başlık/açıklamalarını next-intl mesaj sistemine (tr/en/ar) taşımak. Site EN/AR'de tam çevrili olur.
**Kapsam dışı:** Admin paneli (tek operatör, TR), kurye sayfası `/kurye` (yerel personel, TR), error/not-found/global-error sayfaları, kod yorumları, WhatsApp/ETA/kurye mesaj metinleri (zaten kendi sistemlerinde).

---

## 1. İlkeler
- **Additive & davranış-korur:** TR metinleri birebir mevcut haliyle `tr.json`'a taşınır (TR görünümü değişmez). EN/AR doğal, kaliteli çeviriler (makine-bozuğu değil).
- **Mevcut desen:** next-intl kurulu; server `getTranslations`, client `useTranslations`. Mevcut namespace'ler (nav, hero, whatsapp, footer, order, eta) korunur, üzerine eklenir.
- **Tek anlam-tek anahtar:** Paylaşılan metinler `common`'a; sayfaya özgü olanlar kendi namespace'ine.

## 2. Namespace Planı (yeni)
- `common`: `explore` ("İncele"), `discountBadge` ("%{percent} İNDİRİM"), `all` ("Tümü"), `soon` ("yakında"), `apply` ("başvurun")
- `menu` (lezzetlerimiz): `eyebrow` ("Menümüz"), `empty` ("Bu kategoride ürün yok."), `ingredients` ("İçindekiler"), `reelsHeading` ("Mutfaktan Kareler")
- `franchise` (bayilik sayfası — nav.franchise'tan ayrı): eyebrow, başlık parçaları, alt metin, süreç adımları (01 Başvuru / 02 Değerlendirme / 03 Açılış + açıklamaları), stat etiketleri
- `contact` (iletisim): eyebrow ("Bize Ulaşın"), `branchesSoon` ("Şubelerimiz Yakında"), açıklama
- `ingredients` (malzemelerimiz): `mapSoon` ("Harita yakında")
- `home`: hero `badge` ("Tescilli Premium Künefe"), `featured` ("Öne Çıkanlar"), BrandStory varsayılan metinleri (DB boşsa fallback)
- `cookie` (CookieBanner): mesaj + buton
- `franchiseForm`: `success` ("Başvurunuz Alındı"), `successDesc`, `waCta`, başlık, placeholder'lar (Ad Soyad/Telefon/Şehir/Bütçe), KVKK onay metni
- `legal`: LegalPage fallback ("İçerik yakında eklenecek."), sayfa başlıkları (Gizlilik/Çerez)
- `seo`: her public sayfa için `*.title` / `*.description` (home, menu, menuItemFallback, ingredients, franchise, contact, legal.privacy, legal.cookie)

> Anahtar sayısı ~50. Tümü tr/en/ar üçünde dolu olacak.

## 3. Dosya Etki Haritası
**Değişecek (i18n mesaj dosyaları):** `i18n/messages/tr.json`, `en.json`, `ar.json` — yeni namespace'ler.

**Public bileşen/sayfalar (hardcoded TR → t(...)):**
- `components/public/ProductCard.tsx` ("İncele", "%X İNDİRİM")
- `components/public/OrderFlow.tsx` ("%X İNDİRİM" rozeti)
- `components/public/FeaturedSlider.tsx` ("Öne Çıkanlar")
- `components/public/FranchiseForm.tsx` (form metinleri)
- `components/public/CookieBanner.tsx`
- `components/public/LegalPage.tsx` (fallback)
- `components/layout/Footer.tsx` ("İletişim", "Çerez Politikası")
- `components/layout/HeaderClient.tsx` (`aria-label="Menü"`)
- `app/[locale]/page.tsx` (hero badge → home.badge)
- `app/[locale]/lezzetlerimiz/page.tsx` (eyebrow/empty/Tümü + reels heading) + `generateMetadata`
- `app/[locale]/lezzetlerimiz/[slug]/page.tsx` ("İçindekiler", "Ürün" fallback) + `generateMetadata`
- `app/[locale]/bayilik/page.tsx` (süreç/başlık/metin) + `generateMetadata`
- `app/[locale]/iletisim/page.tsx` (eyebrow/şubeler) + `generateMetadata`
- `app/[locale]/malzemelerimiz/page.tsx` ("Harita yakında") + `generateMetadata`
- `app/[locale]/gizlilik/page.tsx`, `cerez-politikasi/page.tsx` (başlıklar + LegalPage)

**Not:** Server component sayfalarında `getTranslations` async kullanımı; `generateMetadata` içinde `getTranslations({ locale, namespace })`.

## 4. Çeviri Yaklaşımı
- TR: mevcut metin birebir.
- EN/AR: anlamı koruyan, markaya uygun doğal çeviri. Marka adı "Kunefe House" çevrilmez. "Künefe" EN'de "künefe/kunefe", AR'de "كنافة".
- İnterpolasyon: `discountBadge` = TR "%{percent} İNDİRİM", EN "{percent}% OFF", AR "خصم {percent}%".

## 5. Test / Doğrulama
- `grep` ile public dosyalarda kalan Türkçe sabit metin (yorum hariç) kalmadığını teyit.
- 3 dilde her public sayfa gözle: metinler çevrili, layout/RTL bozulmamış.
- `node` ile tr/en/ar anahtar kümelerinin **birebir aynı** olduğunu doğrula (eksik anahtar yok).
- `tsc --noEmit` + `next build` temiz. next-intl eksik-anahtar uyarısı yok.
- TR görünümü regresyonsuz (metinler aynı).

## 6. Riskler
- next-intl: eksik anahtar runtime'da anahtar adını basar → kümeler birebir eşit olmalı (doğrulama adımı).
- Server/client karışımı: yanlış hook → build hatası; her dosyada doğru API (`getTranslations` vs `useTranslations`).
- RTL: AR metinleri uzunluk farkı layout'u bozabilir → gözle kontrol.
