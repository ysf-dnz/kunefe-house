# Canlı Konum Takibi — Faz B2 Tasarımı

**Tarih:** 2026-06-14
**Kapsam:** Kurye telefonunda token'lı (login'siz) konum paylaşım sayfası + konum POST endpoint'i + admin Leaflet/OSM canlı haritası (kuryeler + aktif sipariş konumları, polling).
**Önkoşul:** Faz B1 canlıda — `Courier` modeli + `Order.courierId/assignedAt` + `/admin/kuryeler` + atama.

---

## 1. Amaç ve İlkeler

Kurye, kendisine özel token linkini telefonunda açar; sayfa açık kaldıkça konumu otomatik olarak periyodik sunucuya gider. Admin, gerçek bir harita üzerinde canlı kuryeleri ve teslim edilmemiş siparişlerin müşteri konumlarını görüp sevkiyatı yönetir.

**İlkeler:**
- **Additive & geriye uyumlu:** `Courier`'a yalnız nullable alanlar eklenir; B1 akışı bozulmaz.
- **Token = yetki:** Kuryenin login'i yok; tahmin edilemez token hem sayfaya hem konum endpoint'ine erişimi yetkilendirir.
- **Ücretsiz harita:** Leaflet + OpenStreetMap — API key/billing yok.
- **Serverless-dostu gerçek zaman:** WebSocket yerine **polling** (admin ~15sn) + kurye periyodik POST (~10sn). Vercel serverless'a uygun, basit.
- **YAGNI:** token yenileme, geçmiş rota/iz, ETA, push bildirim kapsam dışı.

**Kritik teknik gerçek:** WhatsApp canlı konumu admin paneline aktaramaz; bu yüzden ayrı kurye web sayfası (Geolocation) şarttır.

---

## 2. Veri Modeli

`Courier` modeline eklenecek (hepsi nullable — additive):

```prisma
  token       String?   @unique
  lat         Float?
  lng         Float?
  lastSeenAt  DateTime?
```

- `token`: kurye linki anahtarı. Yeni kuryelerde uygulama üretir; **mevcut kuryeler migration'da backfill** edilir.
- `lat/lng/lastSeenAt`: son bilinen konum + zaman damgası.

### 2.1 Migration

Migration `courier_location`: 4 sütun ekler + mevcut satırlara token backfill. Backfill, migration SQL'ine eklenen `UPDATE "Courier" SET "token" = gen_random_uuid() WHERE "token" IS NULL;` ile yapılır (Postgres `gen_random_uuid()` mevcut). Yalnız additive — diğer veriyi etkilemez.

> Yeni kurye eklerken token üretimi: `createCourier` action'ı `token: randomUUID()` yazacak şekilde güncellenir (B1'deki createCourier'a eklenir). Token'ı boş kalan eski kuryeler için admin sayfasında "Konum Linki" butonu, token yoksa önce üretir (lazy fallback).

---

## 3. Kurye Konum Sayfası (`app/kurye/[token]/page.tsx`)

- **Konum:** `/kurye/[token]` — `[locale]` segmenti DIŞINDA (kurye için sadeleştirilmiş, TR). Public (auth yok).
- Sunucuda token ile kurye bulunur; yoksa `notFound()` (404).
- **Client alt-bileşeni** (`CourierTracker`): mount olunca `navigator.geolocation.watchPosition` başlatır; her konum güncellemesinde, son POST'tan ≥10sn geçtiyse `POST /api/kurye/[token]/konum` ile `{lat,lng}` gönderir (throttle).
  - Durum: "📍 Konum paylaşılıyor ✓" / "Konum izni gerekli" (reddedilirse).
  - HTTPS gerektirir (canlı site ✓; localhost'ta da çalışır).
- **Atanmış siparişler listesi** (sunucuda hazırlanır): kuryeye atanmış, durumu `delivered`/`cancelled` OLMAYAN siparişler — müşteri adı, adres notu, 📍 **Yol Tarifi** (`https://maps.google.com/?q=lat,lng` veya `o.locationUrl`), 📞 telefon. Salt-okunur.

---

## 4. Konum POST Endpoint (`app/api/kurye/[token]/konum/route.ts`)

- `POST`, gövde `{ lat:number, lng:number }`.
- Token ile kurye bulunur; yoksa `404`.
- `lat/lng` sonlu ve aralıkta (-90..90 / -180..180) değilse `400`.
- `Courier.lat/lng/lastSeenAt = now()` güncellenir → `200 { ok: true }`.
- Hafif; admin auth YOK (token yetkilendirir). Hata durumunda kurye sayfası sessizce yeniden dener.

---

## 5. Admin Canlı Harita (`app/[locale]/admin/canli-takip/page.tsx`)

- Server component: `requireAdmin()`, ilk veriyi okur, client harita bileşenine geçirir.
- **`components/admin/LiveMap.tsx`** (client): **düz `leaflet`** (react-leaflet DEĞİL — Next 16/React 19 peer-dep riski) `useEffect` içinde init; sayfada `dynamic(() => import(...), { ssr: false })` ile yüklenir. Leaflet CSS `leaflet/dist/leaflet.css` import edilir.
  - 🛵 **Canlı kurye** marker'ı: `isCourierLive(lastSeenAt)` (son 5 dk) true olanlar; popup = ad + "son görülme: X dk önce".
  - 🏠 **Aktif sipariş** marker'ı: `delivered`/`cancelled` olmayan + lat/lng dolu siparişler; popup = müşteri adı + ürün.
  - Marker'lara `fitBounds`; hiç marker yoksa Türkiye merkezli varsayılan görünüm (ör. [39.0, 35.0], zoom 6).
  - **Polling:** ~15sn'de bir `GET /api/admin/canli-konum` → marker'ları günceller (haritayı sıfırlamadan).
- Sidebar'a "Canlı Takip" linki.

### 5.1 Polling Endpoint (`app/api/admin/canli-konum/route.ts`)

- `GET`, **admin-auth korumalı** (`auth()`; yoksa 401).
- Döner: `{ couriers: [{id,name,lat,lng,lastSeenAt}], orders: [{id,lat,lng,customerName,productTitle}] }` — yalnız konumu olan canlı kuryeler ve aktif siparişler.

---

## 6. Token Linki Dağıtımı (`/admin/kuryeler` genişletme)

Her kurye satırına:
- **"📍 Konum Linki"** — `{SITE_URL}/kurye/{token}` URL'ini gösterir/kopyalar.
- **"Kuryeye Gönder"** — `wa.me` ile linki kuryenin WhatsApp'ına yollar (mesaj: "Konum paylaşım sayfan: {link}").
- Token yoksa (eski kurye) buton önce token üretir (`ensureCourierToken` action).

---

## 7. Güvenlik / Sağlamlık

- **Token:** `randomUUID()` (tahmin edilemez). Konum POST yalnız geçerli token'da o kuryenin satırını yazar; başka veri açığa çıkmaz. Token sızarsa risk: yalnız o kuryenin sahte konumu — düşük; gerekirse ileride "token yenile" (kapsam dışı).
- **lat/lng:** her iki uçta (POST endpoint + harita) sonlu + aralık doğrulaması.
- **Admin polling endpoint:** `auth()` korumalı.
- **Kurye sayfası:** token dışında hassas veri yok; yalnız o kuryenin atanmış siparişleri listelenir.
- **Best-effort:** kurye POST hatası UI'yı kilitlemez; watchPosition devam eder.

---

## 8. Dosya Etki Haritası

**Yeni:**
- `lib/geo.ts` — `isValidLatLng(lat,lng)`, `isCourierLive(lastSeenAt, nowMs?)` (saf, TDD).
- `tests/unit/geo.test.ts` — testler.
- `app/kurye/[token]/page.tsx` — kurye sayfası (server: token doğrula + atanmış siparişler).
- `components/courier/CourierTracker.tsx` — watchPosition + POST (client).
- `app/api/kurye/[token]/konum/route.ts` — konum POST.
- `app/[locale]/admin/canli-takip/page.tsx` — admin harita sayfası (server).
- `components/admin/LiveMap.tsx` — Leaflet harita (client).
- `app/api/admin/canli-konum/route.ts` — admin polling JSON.

**Değişecek:**
- `prisma/schema.prisma` — Courier token/lat/lng/lastSeenAt.
- `app/[locale]/admin/kuryeler/actions.ts` — `createCourier` token üretir; yeni `ensureCourierToken`.
- `app/[locale]/admin/kuryeler/page.tsx` — "Konum Linki" + "Kuryeye Gönder".
- `app/[locale]/admin/layout.tsx` — "Canlı Takip" linki.
- `package.json` — `leaflet` + `@types/leaflet` bağımlılığı.
- `lib/couriers.ts` — (gerekirse) canlı kurye/aktif sipariş okuma yardımcıları.

---

## 9. Test / Doğrulama

- `lib/geo.ts`: aralık doğrulama (geçerli/sınır/aşan) + `isCourierLive` (5 dk içi/dışı) — Vitest TDD.
- Kurye sayfası: geçersiz token → 404; geçerli token → izin akışı; konum POST 200 ve DB'de lat/lng/lastSeenAt güncelleniyor.
- Konum endpoint: geçersiz lat/lng → 400; geçersiz token → 404.
- Admin harita: kurye/sipariş marker'ları görünür; ~15sn'de güncellenir; marker yoksa Türkiye görünümü; polling endpoint auth'suz 401.
- Token linki: kopyala/WhatsApp doğru URL; eski kuryede token üretilir.
- Geriye uyumluluk: B1 kurye/atama akışı bozulmadan çalışır.
- `tsc --noEmit` + `vitest run` + `next build` temiz (Leaflet `ssr:false` ile build'i kırmaz).

---

## 10. Faz C'ye köprü (kapsam dışı not)

B2'nin canlı konum altyapısı (Courier.lat/lng/lastSeenAt) ileride ETA/teslimat-süresi (Faz C) için temel sağlar. Otomatik müşteri bildirimleri (ulaştı mı, memnuniyet) yine WhatsApp Business Cloud API gerektirir.
