# Faz 0 — Çok-Kiracılık Temeli — Tasarım

**Tarih:** 2026-06-15
**Kapsam:** `Branch`'i kiracıya dönüştür; gerçek `User` tablosu + roller (HQ/şube); `Order` ve `Courier`'a `branchId`; auth'u env-şifreden User tablosuna taşı; admin'i role göre kapsamla; mevcut veriyi "Merkez" şubeye taşı.
**Yol haritası:** docs/superpowers/specs/2026-06-15-cok-subeli-platform-yol-haritasi.md (Faz 0).
**Kapsam dışı:** katalog/stok branchId (Faz 1), müşteri şube yönlendirme (Faz 2), e-ticaret/ödeme/kargo (Faz 3), HQ raporlama (Faz 4).

---

## 1. İlkeler
- **Additive & kesintisiz:** Mevcut tek-kiracılı veri "Merkez" şubeye backfill edilir; site çalışmaya devam eder.
- **Tek kimlik kaynağı:** Auth artık yalnız `User` tablosu (env ADMIN_* yalnız ilk seed için okunur, sonra auth'ta kullanılmaz).
- **IDOR güvenliği:** Her şube-kapsamlı sorgu `branchId` zorlar; şube yöneticisi başka şubenin verisini göremez/değiştiremez.
- **HQ yönetir:** Şube ve kullanıcı hesapları yalnız HQ panelinden açılır.

---

## 2. Veri Modeli

### 2.1 Branch (kiracı) — genişlet
Mevcut `Branch` (name, address Json?, phone, mapsEmbedUrl, workingHours Json?, order) üzerine:
```prisma
  slug      String   @unique @default(cuid())
  isActive  Boolean  @default(true)
  lat       Float?
  lng       Float?
  email     String?
  users     User[]
  orders    Order[]
  couriers  Courier[]
```
(`lat/lng` Faz 2 yönlendirme için; şimdi opsiyonel doldurulabilir.)

### 2.2 User (yeni)
```prisma
enum Role {
  HQ_ADMIN
  BRANCH_ADMIN
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(BRANCH_ADMIN)
  branchId     String?            // HQ_ADMIN için null; BRANCH_ADMIN için zorunlu (uygulama düzeyinde)
  branch       Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

### 2.3 Order / Courier — branchId
Her ikisine:
```prisma
  branchId  String?
  branch    Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
```
(nullable: backfill öncesi + Faz 2'ye kadar public siparişler atanmamış olabilir.)

### 2.4 Migration + seed
Tek migration: Branch alanları + Role enum + User tablosu + Order/Courier.branchId.
Seed script (`scripts/seed-tenancy.mjs`):
- "Merkez" adında bir Branch oluştur (yoksa).
- branchId'siz tüm Order/Courier'ları "Merkez"e bağla.
- `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` env'inden bir `HQ_ADMIN` User oluştur (yoksa). Bundan sonra auth User tablosuna bakar.

---

## 3. Auth Dönüşümü

`auth.ts` `authorize`:
- `prisma.user.findUnique({ where: { email } })`; `isActive` ve `bcrypt.compare(password, user.passwordHash)` kontrolü; sabit-zamanlı davranış korunur (kullanıcı yoksa da compare çalıştır).
- Dönüş: `{ id, email, name, role, branchId }`.
- JWT `callbacks.jwt`: token'a `role` + `branchId` ekle. `callbacks.session`: session.user'a `role` + `branchId` yansıt.
- Env `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` artık auth'ta kullanılmaz (yalnız seed).

Tipler: `next-auth` session genişletme (`types/next-auth.d.ts`) — `role: "HQ_ADMIN"|"BRANCH_ADMIN"`, `branchId: string|null`.

---

## 4. Rol Kapsama Yardımcıları (`lib/require-admin.ts` genişlet / yeni `lib/session.ts`)
- `getSessionUser()` → `{ id, role, branchId } | null` (auth()'tan).
- `requireAdmin()` → herhangi admin (yoksa /admin/login'e). Döndürür sessionUser.
- `requireHQ()` → yalnız `HQ_ADMIN` (değilse 403/yönlendir).
- `branchScope(user)` → HQ ise `undefined` (tümü), BRANCH_ADMIN ise `user.branchId` döndüren yardımcı (sorgularda `where: { branchId }`).

---

## 5. Admin Kapsama

### 5.1 Siparişler (`/admin/siparisler`)
- `getOrders(branchId?)`: branchId verilirse filtrele.
- BRANCH_ADMIN → kendi branchId; HQ → tümü + **şube etiketi** her siparişte + (ops.) şube filtre dropdown.
- HQ siparişe **şube atayabilir** (kurye atamadaki desenle: `assignOrderBranch`). Public siparişler Faz 2'ye kadar atanmamış (branchId null) gelir; HQ bunları şubeye atar.
- Kurye atama dropdown'u: yalnız **o siparişin şubesinin** kuryelerini gösterir.

### 5.2 Kuryeler (`/admin/kuryeler`)
- `getCouriers`/`getAvailableCouriers(branchId?)` branchId filtreli.
- BRANCH_ADMIN → kendi şubesinin kuryeleri; eklediği kurye otomatik kendi branchId'sini alır. HQ → tümü + kurye eklerken şube seçer + şube etiketi.

### 5.3 Şubeler (`/admin/subeler`) — yalnız HQ (`requireHQ`)
- Mevcut CRUD + yeni alanlar (slug, isActive, lat, lng, email).

### 5.4 Kullanıcılar (`/admin/kullanicilar`) — yeni, yalnız HQ
- Liste + ekle: email, ad, rol, şube (BRANCH_ADMIN için zorunlu), şifre belirle (hash'lenir).
- Şifre sıfırla, aktif/pasif, sil. Kendi hesabını silememe koruması.

### 5.5 Sidebar
- HQ: tüm linkler + "Kullanıcılar". BRANCH_ADMIN: sınırlı set (Siparişler, Kuryeler, kendi şubesi profili) — Ayarlar/Kategoriler/Ürünler vb. HQ-only (Faz 1'e kadar ürün/katalog HQ).

---

## 6. Güvenlik / Sağlamlık
- Tüm şube-kapsamlı action'lar: BRANCH_ADMIN gelen `id`'nin **kendi şubesine** ait olduğunu doğrular (örn. sipariş güncelleme → o siparişin branchId == user.branchId). Aksi halde reddet.
- `requireHQ` ile HQ-only sayfa/action'lar korunur (şube yöneticisi kullanıcı/şube yönetemez).
- Şifreler bcrypt. Yeni kullanıcı şifresi action'da hash'lenir, asla düz saklanmaz.
- Pasif kullanıcı login olamaz.

---

## 7. Dosya Etki Haritası
**Yeni:** `prisma` migration + `scripts/seed-tenancy.mjs`; `types/next-auth.d.ts`; `lib/session.ts` (rol yardımcıları); `lib/users.ts`; `app/[locale]/admin/kullanicilar/page.tsx` + `actions.ts`.
**Değişecek:** `prisma/schema.prisma`; `auth.ts`; `lib/require-admin.ts`; `lib/orders.ts`, `lib/couriers.ts` (branchId filtre); `app/[locale]/admin/siparisler/{page,actions}.ts` (kapsama + şube atama); `app/[locale]/admin/kuryeler/{page,actions}.ts` (kapsama + şube); `app/[locale]/admin/subeler/{page,actions}.ts` (yeni alanlar + requireHQ); `app/[locale]/admin/layout.tsx` (role göre sidebar).

---

## 8. Test / Doğrulama
- Seed sonrası: Merkez şube var; eski sipariş/kurye Merkez'e bağlı; env admin HQ_ADMIN olarak login olabiliyor.
- HQ login → tüm şubeleri/siparişleri görür; Kullanıcılar sayfası açılır.
- Yeni BRANCH_ADMIN oluştur → o kullanıcı login → **yalnız kendi şubesinin** sipariş/kuryesini görür; başka şube verisine erişemez (IDOR denemesi reddedilir).
- BRANCH_ADMIN, Kullanıcılar/Şubeler sayfasına erişemez (requireHQ).
- Pasif kullanıcı login olamaz.
- `tsc` + `vitest` + `next build` temiz; mevcut public site regresyonsuz.
- Saf yardımcı (`branchScope`) için birim test.
