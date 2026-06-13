# Sipariş Akışı — Faz A Tasarımı

**Tarih:** 2026-06-13
**Kapsam:** Porsiyon/kişi seçici + entegre fiyat, WhatsApp yapılandırılmış sipariş akışı (GPS konum + adres), DB sipariş kaydı ve admin sipariş listesi.
**Faz B (ayrı spec):** Kurye yönetim sistemi, müsait kurye atama, canlı konum takibi. Bu spec'in kapsamı **dışında**.

---

## 1. Amaç ve İlkeler

Müşteri, ürün detay sayfasında künefenin kaç kişilik olacağını seçer; fiyat anında güncellenir. "Sipariş Ver" ile en az yazıyla, en net adresi (GPS konum linki) toplayan bir akış açılır ve hazır yapılandırılmış bir mesajla WhatsApp sohbeti başlatılır. Sipariş aynı anda sistemde (DB) en iyi-çaba (best-effort) ile kaydedilir; admin tüm siparişleri panelde görür.

**İlkeler:**
- **Geriye dönük uyumluluk:** Mevcut tekil fiyat (`price`/`oldPrice`/`showPrice`) ve porsiyonsuz ürünler bozulmadan çalışmaya devam eder.
- **Müşteri engellenmez:** DB kaydı başarısız olsa bile WhatsApp akışı her zaman açılır.
- **100% admin-yönetimli:** Porsiyon kademeleri admin panelden girilir.
- **Çok dilli (TR/EN/AR):** Tüm yeni metinler mevcut i18n desenine uyar; sipariş mesajı aktif locale'e göre üretilir.
- **Ödeme yok:** Site ödeme almaz; fiyat bilgilendirme amaçlıdır, kesin tutar WhatsApp onayında netleşir.

---

## 2. Veri Modeli

### 2.1 Product (mevcut modele ekleme)

Yeni alan:
```prisma
portions Json?   // [{ persons: number, price: number, oldPrice?: number }]
```

- Dizi kişi sayısına göre artan sırada saklanır.
- Porsiyon **etiketi** saklanmaz; `persons` değerinden i18n ile üretilir
  (TR: "{n} kişilik", EN: "for {n}", AR: "لـ {n} أشخاص").
- Fiyat öncelik kuralı:
  - `portions` doluysa → porsiyon seçici + kademeli fiyat gösterilir.
  - `portions` boş/null ise → mevcut tekil `price`/`oldPrice` davranışı (fallback).
- `showPrice` flag'i hem tekil fiyatı hem porsiyon fiyatlarını kapsar: kapalıysa hiçbir fiyat/seçici gösterilmez (ürün yine "İncele" olarak listelenir; sipariş butonu fiyat gizliyken de çalışır ama tutar satırı boş geçilir).

### 2.2 Order (yeni model)

```prisma
model Order {
  id            String   @id @default(cuid())
  productId     String?                       // ürün silinirse null (SetNull)
  productTitle  String                        // snapshot — ürün sonradan silinse de okunur
  persons       Int?
  price         Decimal? @db.Decimal(10, 2)
  customerName  String?
  customerPhone String?
  addressNote   String?                       // bina/kat/daire/tarif
  locationUrl   String?                       // google maps linki
  lat           Float?
  lng           Float?
  status        String   @default("new")      // new | confirmed | ... (Faz B genişletir)
  createdAt     DateTime @default(now())
}
```

- Kurye ile ilgili alanlar **bilinçli olarak eklenmedi**; Faz B'de `courierId` vb. eklenecek (YAGNI).
- `productId` opsiyonel ilişkidir; `onDelete: SetNull` ile ürün silinince sipariş kaydı korunur (`productTitle` snapshot sayesinde okunur kalır).

### 2.3 Migration

`prisma migrate` ile iki değişiklik tek migration'da: `Product.portions` ekleme + `Order` tablosu. Mevcut veriyi etkilemez (yalnızca additive).

---

## 3. Müşteri Akışı (ürün detay sayfası)

### 3.1 Porsiyon seçici
- Kademeler buton/pill olarak yan yana (örn. "2 kişilik", "4 kişilik", "6 kişilik").
- Varsayılan: ilk (en küçük) kademe seçili.
- Seçim değişince: büyük fiyat + (varsa) üstü çizili eski fiyat + indirim rozeti anında güncellenir (mevcut `formatPrice`/`discountPercent` yardımcıları kullanılır).
- Porsiyon yoksa: mevcut tekil fiyat bloğu gösterilir; seçici görünmez.

### 3.2 "Sipariş Ver" → Sipariş kartı (bottom sheet / modal)
Buton (gold) tıklanınca alttan açılan kart:

1. **📍 "Konumumu Paylaş"** — tarayıcı Geolocation API izni ister.
   - Başarılı: `lat`/`lng` alınır, Google Maps linki üretilir (`https://maps.google.com/?q=lat,lng`), "Konum alındı ✓" gösterilir.
   - Reddedilir/başarısız: kullanıcıya bilgi verilir; akış metin adresle devam eder (konum opsiyonel).
2. **🏠 Adres detayı** — textarea (bina/kat/daire/tarif).
3. **👤 Ad** + **📞 Telefon** — input.
4. **Honeypot** gizli alan (spam koruması).
5. **"WhatsApp'tan Gönder"** butonu.

### 3.3 Gönderim
- Önce best-effort server action (`createOrder`) çağrılır; `await` edilir ama hata yakalanır ve yutulur (akış durmaz).
- Ardından `wa.me` linki **yeni sekmede** açılır (kullanıcı etkileşimiyle tetiklendiği için popup engeline takılmaz).
- Konum HTTPS gerektirir; canlı site HTTPS olduğundan sorun yok. localhost'ta da çalışır.

---

## 4. WhatsApp Mesaj Formatı

Aktif locale'e göre üretilir (örnek TR):

```
🍮 Kunefe House — Sipariş

Ürün: Fıstıklı Künefe
Porsiyon: 4 kişilik · 320 ₺

👤 Ahmet Yılmaz
📞 05XX XXX XX XX
📍 Konum: https://maps.google.com/?q=41.0123,28.9765
🏠 Adres: X mah. Y sok. A apt. kat 3 D5

Siparişi onaylıyorum.
```

- Fiyat gizliyse ("Porsiyon: 4 kişilik" satırında tutar kısmı atlanır).
- Konum yoksa "📍 Konum" satırı atlanır.
- `buildWhatsAppHref` (mevcut, rakam temizleyen) kullanılır; numara `SiteSettings.whatsappNumber`.

---

## 5. Admin Tarafı

### 5.1 ProductForm — porsiyon editörü
- "Porsiyonlar (opsiyonel)" bölümü: dinamik satır listesi.
- Her satır: kişi sayısı (number), fiyat (number), eski fiyat (number, opsiyonel), satır sil butonu.
- "+ Porsiyon ekle" butonu.
- Boş bırakılırsa porsiyon kullanılmaz (tekil fiyat geçerli).
- Kaydetmede action `portions` JSON'unu doğrular: pozitif sayılar, `persons` benzersiz/sıralı, geçersiz satırlar elenir.

### 5.2 Siparişler sayfası (`/admin/siparisler`)
- Liste: yeni → eski sıralı.
- Sütunlar: tarih, ürün, porsiyon (kişi), tutar, ad, telefon, konum (tıkla → Maps yeni sekmede), adres notu, durum etiketi.
- Sipariş silme (image yok, basit delete).
- Sidebar/menüye "Siparişler" linki eklenir.
- Sayfa `force-dynamic` (admin layout deseni); yeni siparişler anında görünür.

---

## 6. Güvenlik / Sağlamlık

- **createOrder action public** (müşteri auth'suz kullanır). Bayilik formundaki kalkanlar uygulanır:
  - Tüm metin alanlarına uzunluk sınırı (ad ≤120, telefon ≤32, adres notu ≤1000, ürün adı ≤200).
  - Honeypot dolu → sessizce başarı dön, kaydetme.
  - Telefon: en az 10 rakam.
  - `lat`/`lng` sayısal ve aralıkta (-90..90 / -180..180); değilse konum alanları null'lanır.
  - `persons` ve `price` pozitif/makul aralık; değilse null.
- Best-effort: action içi tüm DB hataları yakalanır, istemciye hata dönse de istemci yine WhatsApp'ı açar.
- Fiyat manipülasyonu: kritik değil (ödeme yok); yine de server, ürünün gerçek porsiyon fiyatıyla istemciden geleni karşılaştırıp DB'ye **sunucudaki** fiyatı yazar (mesaj metni bilgilendirme).

---

## 7. Dosya Etki Haritası (tahmini)

**Yeni:**
- `lib/portions.ts` — porsiyon tip + parse/validate + etiket i18n yardımcıları.
- `lib/order-message.ts` — WhatsApp mesaj kurucu (locale'e göre).
- `components/public/OrderFlow.tsx` — porsiyon seçici + sipariş kartı (client).
- `app/[locale]/lezzetlerimiz/[slug]/order-actions.ts` — `createOrder` (best-effort).
- `app/[locale]/admin/siparisler/page.tsx` + `actions.ts` — sipariş listesi + silme.
- `components/admin/PortionEditor.tsx` — porsiyon kademe editörü (client).

**Değişecek:**
- `prisma/schema.prisma` — `Product.portions`, `Order` modeli.
- `components/admin/ProductForm.tsx` — porsiyon editörünü dahil et.
- `app/[locale]/admin/urunler/actions.ts` — `portions` oku/doğrula/yaz.
- `app/[locale]/admin/urunler/[id]/page.tsx` — `portions` ProductForm'a geçir.
- `app/[locale]/lezzetlerimiz/[slug]/page.tsx` — OrderFlow'u göm, statik fiyat bloğunu OrderFlow'a devret.
- `lib/products.ts` — (gerekirse) `portions` serialize (Decimal→number) dönüşümü.
- Admin sidebar bileşeni — "Siparişler" linki.
- i18n mesaj dosyaları — yeni anahtarlar (porsiyon, sipariş, konum vb.).

---

## 8. Test / Doğrulama

- Porsiyonsuz eski ürün: detay sayfası eskisi gibi çalışır (regresyon yok).
- Porsiyonlu ürün: seçim → fiyat güncellenir; "Sipariş Ver" → kart → konum izni akışı (izin var/yok) → WhatsApp linki doğru ve mesaj doğru formatlı.
- DB kapalıyken: WhatsApp yine açılır (best-effort doğrulaması).
- Admin: porsiyon ekle/sil/kaydet; siparişler listesi yeni kaydı gösterir; konum linki Maps açar.
- Güvenlik: aşırı uzun/zararlı girişler kırpılır; geçersiz lat/lng null'lanır; honeypot çalışır.
- `tsc --noEmit` + `next build` temiz.
