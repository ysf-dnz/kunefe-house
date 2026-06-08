# Kunefe House — Kurumsal & Franchise Platformu Tasarım Dokümanı

**Tarih:** 2026-06-08
**Marka sahibi:** Yusuf Deniz
**Durum:** Onaylandı (tasarım) → uygulama planına geçilecek

---

## 1. Vizyon & Konsept

**Kunefe House**, henüz şubesi olmayan, **franchise için tasarlanmış premium künefe markası**. Komagene benzeri, binlerce şubeye ulaşmayı hedefleyen, yurt içi + yurt dışı (özellikle Körfez/Orta Doğu) büyüme odaklı bir konsept.

Site **dengeli ikili huni** olarak çalışır:
- **Müşteri huni:** "Lezzeti keşfet, gel ye" — marka prestiji, ürün vitrini, hikâye.
- **Yatırımcı huni:** "Bayi ol" — franchise modelini satar, başvuru toplar.

İki yol ana sayfada eşit ağırlıkta sunulur.

### Marka Varlıkları (güven sinyalleri)
- ✅ **Tescilli marka** — Türk Patent No: 2024/018930, Sınıf 30, sahibi Yusuf Deniz, tescil 29.07.2024.
- ✅ **Domain:** kunefehouse.com
- ✅ **Instagram:** @kunefehouse

### Çekirdek İlkeler
- E-ticaret YOK, online sipariş YOK, sepet YOK.
- AI entegrasyonu YOK, akıllı asistan YOK.
- %100 modüler içerik (hibrit yaklaşım — bkz. Bölüm 3).
- Yüksek Core Web Vitals: **LCP < 2.5s, CLS < 0.1, INP < 200ms**.
- Premium, bol animasyonlu, sinematik UI/UX.
- Çok dilli: **TR / EN / AR** (Arapça RTL).

---

## 2. Teknoloji & Mimari

**Stack:** Next.js (App Router, SSR/SSG/ISR) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Framer Motion · next-intl (i18n + RTL) · next/image · next/font.

> Not: Orijinal brief'te Strapi/Sanity headless CMS önerilmişti; marka sahibi **kendi modüler panelimizi** (Next.js + Prisma + PostgreSQL) tercih etti — aylık CMS ücreti yok, tam kontrol, markaya özel.

### Üç Katman
1. **Public site** — SSG/ISR, ultra hızlı, SEO odaklı. Ziyaretçi + yatırımcı.
2. **Admin panel** (`/admin`) — session korumalı, kendi modüler CMS'imiz.
3. **API katmanı** — koleksiyon CRUD, bayilik form alımı, WhatsApp bildirim webhook.

### Performans Stratejisi
- Görseller: `next/image`, AVIF/WebP, lazy, responsive srcset.
- Videolar: poster görseli + lazy yükleme.
- Fontlar: `next/font`, variable, self-hosted (serif başlık + sans gövde).
- Animasyonlar: GPU-dostu (transform/opacity), `prefers-reduced-motion` korumalı, LCP'yi etkilemez.

---

## 3. Modülerlik Modeli (Hibrit — Yaklaşım C)

- **Sabit iskelet** → 5 çekirdek sayfa. Yapı kodda, içerik DB'de. SEO/performans öngörülebilir.
- **Tam dinamik koleksiyonlar** → Ürünler, Harita pinleri, Reels/Hikaye, Şubeler, Haberler, Bayilik SSS, Sosyal linkler.
- **Serbest blok sayfaları** → Hukuki metinler, kampanyalar (basit blok editör).
- **Global ayarlar** (singleton) → Logo, renkler, WhatsApp no + hazır mesaj, SEO varsayılanları, dil aç/kapa.

---

## 4. Marka Kimliği — Renk Paleti

| Renk | Hex | Kullanım |
|---|---|---|
| Orman Yeşili (ana) | `#1B3B2F` | Ana zemin |
| Orman Yeşili (yardımcı) | `#2D5A43` | İkincil zemin |
| Altın / Amber | `#C9A227` | Vurgu, CTA, başlık aksanı |
| Bakır | `#B87333` | İkincil vurgu, çizgiler |
| Krem / Fildişi | `#F5F0E6` | Açık zemin, metin |
| Fıstık Yeşili | `#7BA05B` | Taze aksan |

Renkler global ayarlardan düzenlenebilir (CSS değişkenleri).

---

## 5. Sayfa Yapıları

### 5.1 Ana Sayfa (`/`) — İkili huni
- **Hero video banner:** tam ekran tel-peynir/şurup videosu, koyu yeşil overlay (opaklık ayarlanabilir), altın H1, alt başlık, çift CTA: *"Lezzetleri Keşfet"* + *"Bayi Ol"*.
- **Marka hikâyesi teaser:** parallax görsel, "Gelenekten geleceğe" rich text.
- **Öne çıkan ürünler slider:** max 5, ürün koleksiyonundan seçilir.
- **"Neden Kunefe House" şeridi:** tescilli marka rozeti + güven ikonları, animasyonlu sayaçlar.
- **Franchise davet bandı:** "1000 şubeye giden yolda yerini al" → /bayilik.
- **Reels/Hikaye showcase:** yatay kaydırmalı şerit (bkz. 5.6).
- **Footer:** sosyal linkler, iletişim, dil seçici.

### 5.2 Malzemelerimiz (`/malzemelerimiz`) — İnteraktif Türkiye haritası
- Responsive SVG harita, yüzde-tabanlı pin koordinatları.
- Animasyonlu pinler (pulse), hover'da büyüme.
- Pin tıkla → popup: başlık, rich text açıklama, görsel/kısa video.
- Pinler koleksiyondan dinamik (Antep fıstığı, Hatay peyniri vb.).

### 5.3 Lezzetlerimiz (`/lezzetlerimiz`) — Görsel katalog (sepet yok)
- Dinamik kategori filtreleri (Klasik / Spesiyal — etiketler).
- Ürün grid: hover'da ikinci görsel, malzeme listesi, kısa açıklama.
- Ürün detay sayfası (`/lezzetlerimiz/[slug]`) — ItemPage schema, besin bilgisi (opsiyonel).

### 5.4 Bayilik (`/bayilik`) — YENİ, yatırımcı huni ⭐
- Hero: "Türkiye'nin tescilli künefe markası".
- **Yatırım modeli:** neden franchise, animasyonlu rakamlar.
- **Süreç adımları:** başvuru → değerlendirme → açılış.
- **Bayilik SSS** (koleksiyon).
- **Başvuru formu:** isim, telefon, şehir, bütçe aralığı, lokasyon notu → panel kaydı + WhatsApp bildirimi. Honeypot + rate-limit anti-spam.
- Tescil belgesi görseli + güven rozetleri.

### 5.5 İletişim (`/iletisim`)
- Şube lokasyonları (koleksiyon — başlangıçta boş/"yakında", franchise ile dolacak).
- Genel iletişim bilgisi + harita.
- Ana iletişim kanalı: yüzen WhatsApp butonu.

### 5.6 Reels/Hikaye Showcase (modül — ana sayfada)
- Admin her öğe için: kapak görseli (poster) + başlık + Instagram linki + sıra.
- Yatay kaydırmalı premium kartlar, hover'da zoom + altın çerçeve animasyonu; opsiyonel "story ring" dairesel kapaklar.
- Tıkla → lightbox'ta video lazy-load oynar veya Instagram'a gider.
- Instagram'ın ağır embed widget'ı KULLANILMAZ (performans için).

### Site Geneli
- Yüzen WhatsApp butonu (her sayfa) — hazır mesaj ile açılır.
- Animasyonlu header (scroll'da küçülür).
- Dil seçici (TR/EN/AR) + RTL desteği.

---

## 6. İletişim & Lead Akışı
- **Müşteri iletişimi:** yüzen WhatsApp (anlık, hazır mesaj).
- **Bayilik başvurusu:** yapılandırılmış form → admin panel kaydı (durum: yeni/arandı/onaylı) + WhatsApp bildirimi.

---

## 7. Animasyon & UI/UX Sistemi

"Bol animasyonlu ama premium / sinematik" — Framer Motion.

**Scroll animasyonları:** fade+rise (stagger), parallax katmanlar, yukarı sayan sayaçlar.

**Mikro-etkileşimler:** CTA shimmer + bakır kenar hover; ürün kartı görsel değişimi + yükselme; harita pini pulse; altın alt-çizgi soldan sağa dolar.

**Sayfa geçişleri:** yumuşak fade, üstte altın yükleme çizgisi.

**İmza dokunuşları:** hero tane/doku overlay, altıgen çini deseni ince arka plan motifi (logodan), şurup-damlası bölüm ayraçları.

**Erişilebilirlik:** tümü `prefers-reduced-motion` ile kapanır; transform/opacity tabanlı; LCP korunur (hero metni anında).

---

## 8. Admin Panel (`/admin`)

Session korumalı. Her metin alanı **TR/EN/AR** sekmeli.

| Bölüm | Yönetilen |
|---|---|
| Genel Ayarlar | Logo (header/footer ayrı), favicon, renkler, WhatsApp no + hazır mesaj, sosyal linkler, dil aç/kapa |
| Ürünler | Başlık, slug (oto), açıklama, malzeme listesi, 2 görsel (hover), kategori, besin bilgisi — 3 dilde |
| Harita Pinleri | Şehir, x/y (%), malzeme, popup başlık/açıklama/medya |
| Reels/Hikaye | Kapak, başlık, IG linki, sıra |
| Şubeler | Ad, adres, telefon, harita embed, çalışma saatleri |
| Haberler/Gündem | Başlık, görsel, metin, yayında mı + popup aç/kapa |
| Bayilik Başvuruları | Liste, durum, detay |
| Bayilik SSS | Soru/cevap, sıra |
| Sayfa İçerikleri | Hero + bölüm metinleri (3 dilde) |
| Serbest Sayfalar | Hukuki/kampanya — blok editör |
| SEO | Sayfa bazında meta başlık/açıklama, OG görsel |

Görsel yükleme: URL/upload, responsive srcset otomatik, zorunlu alt metin (panelde uyarı).

---

## 9. SEO & Teknik
- **Dinamik meta:** her sayfa/ürün CMS'ten title/description/keywords + canonical.
- **OG/Twitter kartları:** dinamik OG görsel.
- **JSON-LD schema:** Organization (logo, tescil, sosyal), Restaurant/LocalBusiness (şubeler dolunca), ItemPage (ürünler), BreadcrumbList.
- **hreflang:** TR/EN/AR otomatik.
- **Dinamik sitemap.xml** + robots.txt (CMS kurallı).
- **Görsel:** AVIF/WebP, lazy, zorunlu alt metin.
- **Semantic HTML.**

---

## 10. Güvenlik
- Admin session korumalı.
- Bayilik formu: honeypot + rate-limit.
- Gizli anahtarlar env'de.

---

## 11. Kapsam Dışı (YAGNI)
- Online sipariş, sepet, ödeme.
- AI / akıllı asistan.
- Müşteri iletişim formu (yerine WhatsApp).
- Kullanıcı hesabı / üyelik (admin hariç).

---

## 12. Veri Modeli (taslak — planda netleşecek)
Koleksiyonlar: `Product`, `ProductCategory`, `MapPin`, `Reel`, `Branch`, `News`, `FranchiseApplication`, `FranchiseFaq`, `SocialLink`, `FreePage`, `PageContent`, `SiteSettings` (singleton), `SeoMeta`. Çok dilli alanlar (TR/EN/AR) için lokalize alan stratejisi planda belirlenecek.
