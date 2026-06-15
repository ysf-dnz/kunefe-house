# Faz 5 — Franchise Onboarding — Tasarım

**Tarih:** 2026-06-15
**Kapsam:** Bayilik başvurusundan tek-tıkla şube açma: HQ onaylar → Branch + BRANCH_ADMIN kullanıcı otomatik oluşur (geçici şifre bir kez gösterilir), başvuru şubeye bağlanır.
**Yol haritası:** Faz 5 (franchise ops). Dış bağımlılık yok. Önkoşul: Faz 0 (Branch+User+requireHQ) canlıda; mevcut FranchiseApplication + /admin/basvurular.
**Kapsam dışı:** Komisyon/bedel hesabı, otomatik e-posta gönderimi (şifre HQ'ya gösterilir; iletim manuel), self-servis kayıt.

---

## 1. İlkeler
- **HQ-only & atomik:** Onboarding yalnız `requireHQ`; Branch+User+başvuru güncellemesi tutarlı yapılır (e-posta çakışırsa hiçbiri oluşmaz).
- **Şifre güvenliği:** Geçici şifre üretilir, bcrypt'le saklanır; düz metin yalnız action sonucunda bir kez döner (DB'de yok).
- **Mevcut desenler:** requireHQ, bcrypt (auth/kullanicilar), useActionState (SettingsForm), prisma.

## 2. Veri Modeli
`FranchiseApplication`'a ekle:
```prisma
  branchId  String?
  branch    Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
```
`Branch` modeline ters ilişki: `applications FranchiseApplication[]`.
Status değer kümesi: mevcut `new/contacted/approved/rejected` + yeni **`onboarded`** (enum yok; basvurular STATUS etiketine eklenir). Migration additive.

## 3. Geçici Şifre (`lib/temp-password.ts`, saf → TDD)
- `generateTempPassword(len = 12): string` — büyük/küçük harf + rakam + sembolden karışık, en az birer tane içerir.
- Test: uzunluk; her sınıftan en az bir karakter; ardışık çağrılarda farklı (rastgelelik). `crypto.randomInt`/`randomBytes` ile (Math.random değil).

## 4. onboardBranch Action (`/admin/basvurular/actions.ts`)
```ts
onboardBranch(formData): Promise<{ ok?: true; email?: string; tempPassword?: string; error?: string }>
```
- `requireHQ()`.
- Oku: applicationId, branchName, adminEmail, adminName (clamp + zorunlu kontrol).
- E-posta benzersiz mi (`prisma.user.findUnique`) → değilse `{ error: "Bu e-posta zaten kayıtlı" }`.
- `tempPassword = generateTempPassword()`; `hash = bcrypt.hash(tempPassword, 10)`.
- Oluştur: `Branch { name: branchName, isActive: true }` → `User { email, name: adminName, role: BRANCH_ADMIN, branchId: branch.id, passwordHash: hash }`.
- Başvuruyu güncelle: `status: "onboarded", branchId: branch.id`.
- `revalidatePath("/admin/basvurular")`; dön: `{ ok: true, email, tempPassword }`.
- Hata durumunda (örn. create patlarsa) `{ error }`; mümkünse yarım kalan Branch temizlenir (try/catch; e-posta kontrolü önce yapıldığı için çakışma riski düşük).

## 5. UI
### 5.1 `OnboardForm` (client, `components/admin/OnboardForm.tsx`)
- Props: applicationId, defaultBranchName (`Kunefe House {city}`), defaultAdminName (başvuran adı).
- `useActionState(onboardBranch)`. Alanlar: şube adı, yönetici e-posta (zorunlu), yönetici adı. "Şube Oluştur" butonu (SubmitButton deseni).
- Başarıda: form yerine **kimlik kartı** — "Şube oluşturuldu. Giriş: {email} / Geçici şifre: {tempPassword}" + "Bu şifreyi şimdi kaydedin/iletin, tekrar gösterilmez" uyarısı.
- Hata: `state.error` kırmızı.

### 5.2 basvurular sayfası
- STATUS map'e `onboarded: { label: "Şube açıldı", cls: "text-green-400" }`.
- Her başvuruda: `branchId` doluysa **"🏪 {şube adı}"** rozeti (onboard edilmiş); değilse **`<OnboardForm .../>`** (açılır/katlanır veya doğrudan). Mevcut durum güncelleme + WhatsApp + Sil korunur.
- Şube adını göstermek için başvuru sorgusuna `include: { branch: { select: { name: true } } }`.

## 6. Güvenlik / Sağlamlık
- `requireHQ` (şube yöneticisi erişemez). E-posta önce kontrol → çakışmada şube oluşmaz. Şifre bcrypt; düz metin sadece bir kez döner, loglanmaz/saklanmaz.
- clamp ile alan uzunlukları; geçersiz e-posta formatı reddedilir (basit kontrol).

## 7. Dosya Etki Haritası
**Yeni:** `lib/temp-password.ts` + `tests/unit/temp-password.test.ts`; `components/admin/OnboardForm.tsx`.
**Değişecek:** `prisma/schema.prisma` (FranchiseApplication.branchId + Branch.applications) + migration; `lib/franchise.ts` (getApplications include branch); `app/[locale]/admin/basvurular/actions.ts` (onboardBranch); `app/[locale]/admin/basvurular/page.tsx` (OnboardForm + onboarded etiket).

## 8. Test / Doğrulama
- `generateTempPassword`: uzunluk, karakter sınıfları, farklılık (TDD).
- HQ /admin/basvurular: bir başvuruda "Şube Oluştur" → e-posta gir → Branch + kullanıcı oluşur; e-posta+geçici şifre bir kez gösterilir; başvuru "Şube açıldı" + rozet.
- Oluşan kullanıcıyla giriş → yalnız kendi şubesi (Faz 0); Kullanıcılar'da görünür.
- Aynı e-posta tekrar → kibar hata, şube oluşmaz.
- Şube yöneticisi onboardBranch'i çağıramaz (requireHQ).
- `tsc` + `vitest` + `next build` temiz; mevcut başvuru akışı regresyonsuz.
