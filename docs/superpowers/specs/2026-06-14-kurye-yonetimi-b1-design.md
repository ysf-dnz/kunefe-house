# Kurye Yönetimi — Faz B1 Tasarımı

**Tarih:** 2026-06-14
**Kapsam:** Admin'de kurye CRUD + müsaitlik/aktiflik durumu, siparişe kurye atama, kuryeye WhatsApp ile sipariş gönderme, sipariş durum makinesi.
**B2 (ayrı spec):** Canlı konum takibi — kurye telefon paneli (token linkli, Geolocation paylaşır) + admin Leaflet/OSM haritası + polling. Bu spec'in kapsamı **dışında**.

---

## 1. Amaç ve İlkeler

Faz A'da müşteri siparişi WhatsApp'a + DB'ye düşüyor (Order modeli, `/admin/siparisler`). B1, admin'in bu siparişlere **kurye atamasını** ve atanan kuryeyi **WhatsApp ile bilgilendirmesini** sağlar. Kurye, mesajdaki müşteri konum linkine tıklayıp navigasyona başlar.

**İlkeler:**
- **Additive & geriye uyumlu:** Mevcut Order verisi ve `/admin/siparisler` akışı bozulmaz; alanlar opsiyonel eklenir.
- **wa.me handoff:** Otomatik mesaj (Business API) YOK; admin tetikli `wa.me` linki — Faz A ile tutarlı, ek altyapı/maliyet yok.
- **Admin-only:** B1'de kurye-yüzlü sayfa yok; tüm işlemler admin panelde, `auth()` korumalı. Kurye yalnız WhatsApp mesajı alır.
- **Mevcut desenler:** Admin CRUD, server action + `requireAdmin`/`guard`, `revalidatePath`, `cache()` okuma — projedeki kurulu desenler izlenir.
- **Kurye mesajı her zaman Türkçe** (kurye yerel personel; locale'e bağlı değil).

---

## 2. Veri Modeli

### 2.1 Yeni `Courier` modeli

```prisma
model Courier {
  id          String   @id @default(cuid())
  name        String
  phone       String
  isAvailable Boolean  @default(true)   // müsait / meşgul
  isActive    Boolean  @default(true)   // aktif / pasif (işten ayrılan pasif yapılır, silinmez)
  note        String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  orders      Order[]
}
```

### 2.2 `Order` modeline ekleme

```prisma
  courierId     String?
  courier       Courier? @relation(fields: [courierId], references: [id], onDelete: SetNull)
  assignedAt    DateTime?
```

- `onDelete: SetNull`: kurye silinse/pasifleşse sipariş kaydı korunur (`courierId` null olur).
- Mevcut `status` alanı korunur; B1 durum makinesi değer kümesini netleştirir (bkz. §5).

### 2.3 Migration

Tek migration: `Courier` tablosu + `Order.courierId`/`assignedAt`. Yalnız additive — mevcut veriyi etkilemez. Migration adı: `courier_management`.

---

## 3. Admin "Kuryeler" Sayfası (`/admin/kuryeler`)

- **Liste:** aktif kuryeler üstte; her satır: ad, telefon, müsaitlik rozeti (🟢 Müsait / 🔴 Meşgul), aktif/pasif.
- **Ekle formu:** ad (zorunlu), telefon (zorunlu), not (opsiyonel). `SubmitButton` deseni.
- **Müsaitlik toggle:** tek tık müsait ↔ meşgul (server action).
- **Aktif/pasif toggle:** pasif kurye atama listesinde görünmez ama sipariş geçmişi korunur.
- **Sil:** kalıcı silme (atanmış siparişlerde `courierId` null'lanır — FK SetNull).
- **Sidebar:** `/admin/kuryeler` linki (admin layout).
- Sayfa admin layout'u altında (force-dynamic).

## 4. Siparişe Kurye Atama (`/admin/siparisler` genişletme)

Mevcut sipariş kartına eklenir:
- **Kurye dropdown'u:** seçenekler = *aktif + müsait* kuryeler; sipariş zaten atanmışsa o kurye (pasif/meşgul olsa da) seçili gösterilir. "Ata" → `order.courierId` + `assignedAt = now()` yazılır.
- **Atanan kurye etiketi:** kart üstünde "🛵 {kurye adı}".
- **"Kuryeye Gönder" butonu:** atanmış kurye varsa görünür → kuryenin telefonuna `wa.me` linki, mesaj `buildCourierMessage` ile (bkz. §4.1). Yeni sekmede açılır.
- **Atamayı kaldır:** dropdown'da "— Kurye yok —" seçeneği → `courierId` null.

### 4.1 Kurye WhatsApp mesajı (`lib/courier-message.ts`, saf fonksiyon)

Girdi: `{ productTitle, persons, customerName, customerPhone, addressNote, locationUrl }`. Çıktı (Türkçe):

```
🛵 Kunefe House — Teslimat

Sipariş: Fıstıklı Künefe · 4 kişilik
👤 Müşteri: Ahmet Yılmaz
📞 Telefon: 05XX...
🏠 Adres: X mah. Y sok. A apt. kat 3 D5
📍 Konum: https://maps.google.com/?q=41.01,28.97

Lütfen siparişi teslim alıp yola çıktığında bilgi ver.
```

- Boş alanlar (konum yoksa 📍 satırı, telefon yoksa 📞 satırı) atlanır.
- `buildWhatsAppHref` (mevcut) ile kuryenin numarasına link üretilir.

## 5. Sipariş Durum Makinesi

Değer kümesi (TR etiketleri admin'de): `new` (Yeni) → `confirmed` (Onaylandı) → `preparing` (Hazırlanıyor) → `on_the_way` (Yolda) → `delivered` (Teslim edildi) · `cancelled` (İptal). Faz A'daki durum dropdown'u bu kümeyle hizalanır (eksik `preparing` eklenir). Durum geçişleri serbest (admin elle seçer); katı state-machine zorlaması YOK (YAGNI). Atama durumu değiştirmez (status ayrı, admin kontrolünde).

---

## 6. Güvenlik / Sağlamlık

- Tüm kurye + atama server action'ları `guard()` (oturum yoksa hata) — mevcut admin desen.
- Telefonlar `wa.me` için `replace(/\D/g, "")` ile rakamlaştırılır.
- Kurye ekleme: ad/telefon zorunlu + uzunluk sınırı (ad ≤120, telefon ≤32, not ≤500).
- Atama: gelen `courierId` yalnız var olan kuryeye eşleşirse yazılır (Prisma FK zaten korur; geçersizse hata yutulmaz, admin görür).
- Pasif/silinen kurye → FK SetNull ile sipariş geçmişi bozulmaz.

---

## 7. Dosya Etki Haritası

**Yeni:**
- `lib/couriers.ts` — `getCouriers`, `getAvailableCouriers` (cache'li okuma).
- `lib/courier-message.ts` — `buildCourierMessage` (saf, TDD).
- `tests/unit/courier-message.test.ts` — testler.
- `app/[locale]/admin/kuryeler/page.tsx` — kurye listesi + ekle formu.
- `app/[locale]/admin/kuryeler/actions.ts` — `createCourier`, `toggleAvailability`, `toggleActive`, `deleteCourier`.
- `components/admin/CourierAssign.tsx` — sipariş kartında kurye dropdown + "Kuryeye Gönder" (client).

**Değişecek:**
- `prisma/schema.prisma` — `Courier` modeli + `Order.courierId`/`assignedAt`.
- `app/[locale]/admin/siparisler/page.tsx` — atanan kurye etiketi + `CourierAssign` bileşeni; sipariş sorgusuna `courier` include + müsait kurye listesi.
- `app/[locale]/admin/siparisler/actions.ts` — `assignCourier(orderId, courierId|null)`.
- `lib/orders.ts` — `getOrders` sorgusuna `include: { courier: true }`.
- `app/[locale]/admin/layout.tsx` — "Kuryeler" sidebar linki.

---

## 8. Test / Doğrulama

- `lib/courier-message.ts`: tam/eksik alanlı mesaj üretimi (TDD, Vitest).
- Admin: kurye ekle/müsaitlik toggle/pasif/sil çalışır.
- Atama: dropdown yalnız aktif+müsait kuryeleri listeler; ata → kart etiketinde kurye görünür; "Kuryeye Gönder" doğru `wa.me` linki + doğru mesaj açar.
- Kurye sil → atanmış siparişte `courierId` null olur, sipariş kaybolmaz.
- Geriye uyumluluk: kuryesiz mevcut siparişler eskisi gibi listelenir.
- `tsc --noEmit` + `vitest run` + `next build` temiz.

---

## 9. B2'ye köprü (kapsam dışı not)

B1'in `Courier` modeli ve `Order.courierId` ilişkisi B2'nin temelidir. B2'de eklenecek: `Courier.lat/lng/lastSeenAt` (canlı konum), kurye token alanı + `/kurye/[token]` mobil sayfa (`watchPosition` → POST), admin Leaflet/OSM haritası + ~10-15sn polling.
