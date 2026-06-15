# Faz 4 — HQ Raporlama Konsolu — Tasarım

**Tarih:** 2026-06-15
**Kapsam:** Genel Merkez (HQ_ADMIN) için şubeler arası salt-okunur gösterge paneli (`/admin/rapor`): tarih aralığına göre sipariş/ciro/teslimat özeti, şube tablosu, en çok satan ürünler, düşük stok uyarıları.
**Yol haritası:** Faz 4. Dış bağımlılık yok. Önkoşul: Faz 0-2 canlıda (requireHQ, Order/Courier.branchId, BranchProduct).
**Kapsam dışı:** Grafik kütüphanesi (sayı kartı + tablo), CSV export, gerçek-zamanlı, özel tarih aralığı, kur çevirisi.

---

## 1. İlkeler
- **Salt-okunur & HQ-only:** Tüm sayfa `requireHQ`; veri değiştirmez.
- **Ciro para birimine göre ayrı:** ₺/$/ر.ق ayrı toplanır (kur çevirisi YOK).
- **Düşük hacim → basit aggregation:** Seçili aralıktaki siparişler çekilip JS'te gruplanır (binlerce sipariş için sorun değil; ileride SQL'e taşınabilir).
- **Mevcut yardımcılar:** `lib/duration` (süre), `lib/price` (formatPrice/toNumber), `requireHQ`.

## 2. Tarih Aralığı
`?range=today|7g|30g|all` (varsayılan `7g`). `rangeStart(range, now)` (saf, TDD) başlangıç `Date | null` döner (all → null = filtre yok). Sayfada preset linkler (Bugün/7 Gün/30 Gün/Tümü).

## 3. Veri / Aggregation (`lib/report.ts`)
- `rangeStart(range: "today"|"7g"|"30g"|"all", now: Date): Date | null` — saf, TDD.
- `getReport(range)`:
  - Siparişleri çek: `where: { createdAt >= start }` (start null ise filtresiz), `include: { branch: {select:{id,name}} }`, `select` gerekli alanlar (branchId, price, currency, status, createdAt, assignedAt, deliveredAt, productTitle).
  - JS'te hesapla:
    - **Özet:** toplam sipariş, delivered sayısı, ort. teslimat süresi (assignedAt+deliveredAt dolu olanların `minutesBetween` ortalaması), ciro `{ TRY, USD, QAR }` (her order'ın price'ı currency'sine eklenir).
    - **Şube tablosu:** branchId/name'e göre grup → {orders, delivered, revenue per currency, avgDelivery}. branchId null → "Atanmamış".
    - **En çok satan:** productTitle'a göre sayı, desc, top 10.
  - Aktif kurye: `prisma.courier.count({ where: { isActive: true } })` (aralıktan bağımsız anlık).
  - Düşük stok: `prisma.branchProduct.findMany({ where: { stock: { lte: 5, not: null } }, include: { branch, product } })`.
- Decimal price → `toNumber`.

## 4. Sayfa (`/admin/rapor`, HQ-only)
- `requireHQ()`; `searchParams.range`.
- **Üst kartlar:** Sipariş · Teslim · Ort. teslimat (`formatDuration`) · Aktif kurye · Ciro (₺ X · $ Y · ر.ق Z — sıfır olanlar gizli).
- **Aralık preset linkleri** (seçili vurgulu).
- **Şube tablosu:** Şube · Sipariş · Teslim · Ciro (₺ ana + diğerleri küçük) · Ort. teslimat.
- **En çok satanlar:** ürün adı + sipariş sayısı listesi.
- **Düşük stok:** şube + ürün + kalan stok (kırmızı). Boşsa "Düşük stok yok".
- Sidebar: HQ için "Rapor" linki.

## 5. Güvenlik / Sağlamlık
- `requireHQ` (şube yöneticisi /admin'e atılır). Salt-okunur, mutation yok → IDOR yok.
- Ciro toplamı yalnız geçerli price'lardan; null price atlanır. Ort. teslimat yalnız assignedAt+deliveredAt dolu siparişlerden.
- Boş veri durumları: 0 sipariş → kartlar 0, tablolar "veri yok".

## 6. Dosya Etki Haritası
**Yeni:** `lib/report.ts` + `tests/unit/report.test.ts` (rangeStart); `app/[locale]/admin/rapor/page.tsx`.
**Değişecek:** `app/[locale]/admin/layout.tsx` (HQ "Rapor" linki).

## 7. Test / Doğrulama
- `rangeStart`: today → günün başı; 7g/30g → now - N gün; all → null. (TDD, now enjekte edilir)
- HQ /admin/rapor: kartlar + tablo doğru; aralık değişince veriler değişir; ciro para birimine göre ayrı; düşük stok listesi.
- Şube yöneticisi /admin/rapor → /admin'e atılır.
- 0 sipariş → çökmez.
- `tsc` + `vitest` + `next build` temiz.
