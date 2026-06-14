# Teslimat Süresi — Faz C1 Tasarımı

**Tarih:** 2026-06-14
**Kapsam:** (A) Admin teslimat süre takibi (Order.deliveredAt + raporlama). (B) Fıstık butonu → premium "Kaç dakikada gelir?" ETA akışı (konum paylaşımı → WhatsApp). (C) C2-C4 (WhatsApp Business API + ödeme) için hazırlık listesi — yalnız belge, kod yok.
**Önkoşul:** B1+B2 canlıda (Courier, Order.courierId/assignedAt/status, canlı konum). Faz A sipariş akışı + WhatsApp/konum desenleri mevcut.

---

## 1. Amaç ve İlkeler

Teslimat süresini hem **ölçmek** (admin: atama→teslim kaç dakika) hem de müşteriye **vadetmek** için bir kanal kurmak (fıstık butonu ETA akışı: müşteri konumunu paylaşır, marka WhatsApp'tan süre söyler). İkisi aynı temaya hizmet eder: konum + süre.

**İlkeler:**
- **Dış bağımlılık yok:** C1 tamamen mevcut stack ile (Prisma + wa.me + Geolocation). WhatsApp Business API GEREKMEZ.
- **Additive & geriye uyumlu:** `Order.deliveredAt` nullable; eski siparişler bozulmaz. Fıstık butonunun davranışı değişir ama numara/mesaj ayarları korunur.
- **Premium UX:** ETA modalı marka diliyle (altın gradient, framer-motion, bottom-sheet, RTL, TR/EN/AR).
- **Saf mantık test edilir:** `lib/duration.ts` ve `lib/eta-message.ts` Vitest TDD.

---

## 2. Bölüm A — Admin Teslimat Süre Takibi

### 2.1 Veri modeli
`Order` modeline: `deliveredAt DateTime?` (additive, nullable).

### 2.2 Damgalama (`updateOrderStatus` genişletme)
- Yeni durum `delivered` ve `deliveredAt` boşsa → `deliveredAt = new Date()`.
- Yeni durum `delivered` DEĞİLSE → `deliveredAt = null` (yanlış işaretleme düzelir, yeniden teslimde yeniden damgalanır).
- Diğer mantık (kurye atama vb.) değişmez.

### 2.3 `lib/duration.ts` (saf, TDD)
```ts
minutesBetween(from: Date|string|null, to: Date|string|null): number | null
formatDuration(minutes: number | null): string | null   // 34 → "34 dk", 65 → "1 sa 5 dk", 0 → "0 dk"
```
- Geçersiz/null girdide `null`.

### 2.4 Admin Siparişler gösterimi
- Teslim edilmiş (deliveredAt dolu) siparişte:
  - **Teslimat** = `minutesBetween(assignedAt, deliveredAt)` (atama yoksa gösterilmez).
  - **Toplam** = `minutesBetween(createdAt, deliveredAt)`.
  - Satır: "⏱ Teslimat: 34 dk · Toplam: 41 dk" (yalnız hesaplanabilenler).
- Sayfa başında **ortalama teslimat süresi**: deliveredAt + assignedAt dolu siparişlerin `minutesBetween(assignedAt, deliveredAt)` ortalaması → `formatDuration`. Veri yoksa gösterilmez.

---

## 3. Bölüm B — Fıstık Butonu "Kaç dakikada gelir?" ETA Akışı

### 3.1 Davranış değişimi
Mevcut `components/ui/WhatsAppButton.tsx` (server) doğrudan `wa.me` linki veren `<a>` render ediyor. Yeni davranış: server bileşeni numara + locale'i bir **client** bileşene (`EtaButton`) geçirir; tıklama doğrudan WhatsApp yerine **modal** açar. Numara/`whatsappMessage` ayarları korunur (konumsuz yedek mesajda kullanılır).

### 3.2 `components/ui/EtaButton.tsx` (client)
- Yüzen fıstık ikonu (mevcut `/fistik.svg`, aynı konum: `fixed bottom-6 end-6 z-50`). Tıklama → modal aç.
- **Modal (premium):**
  - Backdrop blur + alttan açılış (mobil bottom-sheet, masaüstü ortalı), framer-motion `AnimatePresence`.
  - 🛵 kurye ikonu hafif yatay "yaklaşıyor" animasyonu (framer-motion, prefers-reduced-motion'a saygılı).
  - Başlık: t("eta.title") — "Adresinize kaç dakikada gelir?"
  - Alt metin: t("eta.subtitle") — "Konumunu paylaş, en hızlı teslim süresini WhatsApp'tan hemen söyleyelim."
  - **"📍 Konumumu Paylaş"** (gold) → `navigator.geolocation.getCurrentPosition` → başarı: "Konum alındı ✓" (yeşil); ret: kibar uyarı, akış konumsuz devam eder.
  - Opsiyonel adres detayı input (bina/kat/tarif), `maxLength` 200.
  - Ana CTA **"WhatsApp'tan Sor"** → `buildWhatsAppHref(number, buildEtaMessage(...))` yeni sekmede; konum varsa konumlu mesaj.
  - İkincil küçük link **"Konum olmadan sor"** → konumsuz mesajla `wa.me`.
  - Kapat (×) + backdrop tıkla kapat. RTL uyumlu (`end-6`, dir).
- Erişilebilirlik: `role="dialog"`, `aria-label`, Esc ile kapat, odak modale.

### 3.3 `lib/eta-message.ts` (saf, TDD)
```ts
buildEtaMessage(i: { locationUrl?: string|null; addressNote?: string|null; locale: Locale }): string
```
- Konum varsa (TR): "Merhaba 🛵 Bu adrese kaç dakikada teslim edebilirsiniz?\n📍 {locationUrl}" (+ "🏠 {addressNote}" doluysa).
- Konum yoksa (TR): "Merhaba, teslimat süresi hakkında bilgi alabilir miyim?"
- EN/AR karşılıkları (order-message.ts desenindeki gibi locale haritası).

### 3.4 i18n
`i18n/messages/{tr,en,ar}.json` içine `eta` namespace: `title, subtitle, shareLocation, locationReceived, locationFailed, addressNote, ask, askWithoutLocation, close`.

---

## 4. Güvenlik / Sağlamlık

- ETA akışı tamamen istemci + wa.me; sunucuya veri yazılmaz (DB kaydı yok — bu yalnız bir soru kanalı). Kişisel veri yalnız kullanıcının kendi WhatsApp'ına gider.
- `deliveredAt` damgalama `updateOrderStatus` içinde, mevcut `guard()` (admin auth) altında.
- `duration`/`eta-message` saf fonksiyonlar; null/geçersiz girdi güvenli.
- Konum HTTPS ister (canlı ✓). İzin reddi akışı kilitlemez (konumsuz yedek).

---

## 5. Dosya Etki Haritası

**Yeni:**
- `lib/duration.ts` + `tests/unit/duration.test.ts`.
- `lib/eta-message.ts` + `tests/unit/eta-message.test.ts`.
- `components/ui/EtaButton.tsx` (client modal).

**Değişecek:**
- `prisma/schema.prisma` — `Order.deliveredAt`.
- `app/[locale]/admin/siparisler/actions.ts` — `updateOrderStatus` deliveredAt damgalama.
- `app/[locale]/admin/siparisler/page.tsx` — süre satırı + ortalama.
- `components/ui/WhatsAppButton.tsx` — `<a>` yerine `<EtaButton number locale .../>` render.
- `i18n/messages/{tr,en,ar}.json` — `eta` namespace.

---

## 6. Test / Doğrulama

- `lib/duration.ts`: minutesBetween (geçerli/null/ters), formatDuration (dk / sa+dk / null) — TDD.
- `lib/eta-message.ts`: konumlu/konumsuz + adres notlu + EN/AR — TDD.
- Admin: bir siparişi "delivered" yap → deliveredAt damgalanır, süre satırı + ortalama görünür; geri alınca temizlenir.
- Fıstık butonu → modal açılır; konum izni akışı (var/yok); "WhatsApp'tan Sor" doğru mesaj + link; "Konum olmadan sor" yedeği; mobil bottom-sheet + RTL.
- Geriye uyumluluk: eski siparişler (deliveredAt yok) sorunsuz listelenir.
- `tsc --noEmit` + `vitest run` + `next build` temiz.

---

## 7. Bölüm C — C2/C3/C4 Hazırlık Listesi (KAPSAM DIŞI — yalnız belge)

C1 bittikten sonra otomatik WhatsApp mesajları ve ödeme için **kullanıcının (Yusuf) yapması gereken** ön koşullar. Bunlar olmadan kod kurulup test edilemez; her biri kendi spec→plan turunu hak eder.

### C2 — WhatsApp Business Cloud API altyapısı
- [ ] Meta Business hesabı aç + **işletme doğrulaması** (belge ister, gün-hafta sürer).
- [ ] **Ayrı WhatsApp Business numarası** ayarla (API'ye bağlanan numara WhatsApp/WhatsApp Business uygulamasında kullanılamaz; mevcut @kunefehouse numarası kişisel kalır).
- [ ] Cloud API uygulaması + **kalıcı access token** + Phone Number ID al.
- [ ] **Şablon mesajları** Meta onayına gönder (ulaştı-mı, memnuniyet vb. — her biri ayrı onay).
- [ ] **Konuşma başına ücret** modelini kabul et (Meta faturalandırır).
- [ ] (Bizim yazacağımız) Webhook endpoint + env'de token/secret.

### C3 — Otomatik mesajlar (C2'ye bağlı)
- [ ] "Siparişiniz ulaştı mı?" — teslim sonrası otomatik (deliveredAt tetikli).
- [ ] Memnuniyet anketi — teslimden birkaç saat sonra (zamanlanmış iş / cron).
- [ ] Webhook ile müşteri yanıtlarını işleme.
- Not: zamanlanmış gönderim için Vercel Cron veya harici zamanlayıcı gerekir.

### C4 — Ödeme linki (ayrı büyük entegrasyon)
- [ ] **Ödeme sağlayıcı** seç + hesap/sözleşme: iyzico veya PayTR (Türkiye; WhatsApp Pay pratik değil).
- [ ] API anahtarları + KVKK/güvenlik (PCI yükünü sağlayıcı taşır ama akış güvenliği bizde).
- [ ] Sipariş→ödeme linki üretimi + ödeme durumu webhook'u.
- [ ] Order'a ödeme durumu alanları (paymentStatus, paymentRef).

> C1'in `deliveredAt` + konum kanalı, C3'ün (ulaştı-mı/memnuniyet) ve süre vaadinin veri temelini sağlar.
