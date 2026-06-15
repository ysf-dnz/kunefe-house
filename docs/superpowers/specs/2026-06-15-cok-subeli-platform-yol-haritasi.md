# Çok Şubeli Platform — Ana Yol Haritası

**Tarih:** 2026-06-15
**Amaç:** Tek-kiracılı Kunefe House sitesini, TR genelinde çok şubeli (franchise) bir platforma dönüştürmek. İki iş modeli aynı anda: (A) yerel teslimat franchise'ı (şube + kurye), (B) TR geneli kargo e-ticareti.
**İlke:** Tek kod tabanı, tek Supabase DB, multi-tenant. **Fork YOK.** Her faz kendi spec→plan→kod döngüsüyle, additive ve mevcut sistemi bozmadan.

---

## Karara bağlanan mimari ilkeler
- **Multi-tenant:** `Branch` = kiracı. Veriler `branchId` ile kapsanır. Yeni şube = panelde bir satır.
- **Roller:** `HQ_ADMIN` (tüm şubeler), `BRANCH_ADMIN` (yalnız kendi şubesi). Gerçek `User` tablosu (mevcut tek env-şifre kaldırılır).
- **Katalog:** **Merkezî marka kataloğu** (HQ tanımlar) + **şube override** (var/yok, stok, yerel fiyat). Şube rastgele ürün uyduramaz → marka tutarlılığı.
- **Sipariş tipleri:** `delivery` (yerel şube + kurye) ve `shipping` (TR geneli kargo) tek sistemde.

---

## Fazlar (sıralı alt-projeler)

### Faz 0 — Çok-kiracılık temeli  *(ön koşul; dış bağımlılık yok)*
- `Branch`'i kiracıya dönüştür (slug, aktif, konum lat/lng, iletişim).
- `User` tablosu + rol (`HQ_ADMIN`/`BRANCH_ADMIN`) + `branchId`. NextAuth env-şifre → User tablosu doğrulaması.
- `Order`, `Courier`'a `branchId`. Mevcut veri "Merkez" şubeye backfill.
- Admin sorguları + sayfaları role göre kapsamlanır (HQ hepsi / şube kendi).
- **Çıktı:** Birden çok şube ve şube-yöneticisi; her biri kendi sipariş/kuryesini görür.

### Faz 1 — Katalog + stok
- Merkezî katalog (HQ) + şube override tablosu (`BranchProduct`: available, stock, localPrice).
- Stok bitince ürün "tükendi" gösterilir. Şube kendi menüsünü açar/kapar, stok girer.
- **Çıktı:** Her şube kendi stoğunu/menüsünü yönetir; katalog merkezden gelir.

### Faz 2 — Yerel teslimat yönlendirme (Model A)
- Müşteri konumu → en yakın aktif şube (geo/haversine) veya manuel şube seçici.
- `Order.branchId` set; sipariş ilgili şubeye düşer. B1/B2 (kurye + canlı konum) şubeye bağlanır.
- **Çıktı:** Şehir X'teki müşteri → en yakın şube → o şubenin kuryesi.

### Faz 3 — E-ticaret / TR geneli kargo (Model B)  *(dış bağımlılık: ödeme + kargo hesapları)*
- Sepet + checkout + adres + **ödeme** (iyzico/PayTR) + **kargo** (Yurtiçi/Aras/MNG API + takip no).
- Sipariş tipi `shipping`; merkezden veya en yakın şubeden gönderim.
- **Çıktı:** Tüm TR'ye kartla ödemeli, kargolu özel ürün satışı.

### Faz 4 — HQ konsolu / raporlama  *(dış bağımlılık yok)*
- Merkez paneli: şubeler arası satış, sipariş, stok, kurye performansı, kargo durumu, en çok satan.
- **Çıktı:** Genel merkezin tüm zinciri tek ekrandan görmesi.

### Faz 5 — Franchise operasyonu  *(opsiyonel, ileri)*
- Self-servis şube başvuru/onay akışı, franchise bedeli/komisyon takibi.

---

## Kullanıcının kuracağı dış ön koşullar
- **Faz 3 ödeme:** iyzico veya PayTR ticari hesap + sözleşme + API anahtarları.
- **Faz 3 kargo:** Yurtiçi/Aras/MNG kurumsal anlaşma + API erişimi.
- **(Opsiyonel) otomatik WhatsApp bildirimleri:** WhatsApp Business Cloud API (önceki Faz C2/C3).

Faz 0, 1, 2, 4 dış bağımlılık olmadan kodlanabilir. Faz 3 hesap kurulumuna bağlıdır.

---

## Geriye dönük uyumluluk / geçiş
- Tüm değişiklikler additive: mevcut tek-kiracılı veri "Merkez" şubeye taşınır; site kesintisiz çalışmaya devam eder.
- Her faz ayrı branch + merge + deploy; final review + testlerle.

## Sonraki adım
**Faz 0 (çok-kiracılık temeli)** detaylı tasarımı (kendi spec'i) → plan → kod.
