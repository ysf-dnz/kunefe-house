# Faz 5 — Franchise Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bayilik başvurusundan tek-tıkla şube açma: HQ onaylar → Branch + BRANCH_ADMIN kullanıcı oluşur (geçici şifre bir kez gösterilir), başvuru şubeye bağlanır.

**Architecture:** Additive `FranchiseApplication.branchId`. Saf `generateTempPassword` (TDD). `onboardBranch` action (requireHQ): e-posta benzersizlik → Branch+User+başvuru güncelle, geçici şifreyi sonuçta bir kez döndür. `OnboardForm` client (useActionState) kimlik bilgisini gösterir.

**Tech Stack:** Next.js 16.2, Prisma 7.8, bcryptjs, node:crypto, Vitest.

---

## File Structure
- `prisma/schema.prisma` — FranchiseApplication.branchId + Branch.applications.
- `lib/temp-password.ts` (+test).
- `lib/franchise.ts` — getApplications include branch.
- `app/[locale]/admin/basvurular/actions.ts` — onboardBranch.
- `components/admin/OnboardForm.tsx` (client).
- `app/[locale]/admin/basvurular/page.tsx` — OnboardForm + onboarded etiket.

---

## Task 1: Şema + Migration + franchise okuma

**Files:** Modify `prisma/schema.prisma`, `lib/franchise.ts`

- [ ] **Step 1: FranchiseApplication + Branch ilişkisi**

`prisma/schema.prisma` — `FranchiseApplication` modeline ekle:
```prisma
  branchId  String?
  branch    Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
```
`Branch` modeline ekle: `  applications FranchiseApplication[]`

- [ ] **Step 2: Migration**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name application_branch`
Expected: uygulanır + client üretilir. (P1001 → 3x; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 3: lib/franchise getApplications include branch**

`lib/franchise.ts` içindeki `getApplications`'a branch include ekle:
```ts
export const getApplications = cache(async () => {
  return prisma.franchiseApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: { select: { name: true } } },
  });
});
```
(Mevcut imzayı koru; yalnız include ekle.)

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations lib/franchise.ts
git commit -m "feat(db): FranchiseApplication.branchId + getApplications include branch"
```

---

## Task 2: `lib/temp-password.ts` (TDD)

**Files:** Create `lib/temp-password.ts`, `tests/unit/temp-password.test.ts`

- [ ] **Step 1: Test (failing)**

`tests/unit/temp-password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateTempPassword } from "@/lib/temp-password";

describe("generateTempPassword", () => {
  it("varsayılan 12 hane", () => { expect(generateTempPassword().length).toBe(12); });
  it("istenen uzunlukta", () => { expect(generateTempPassword(16).length).toBe(16); });
  it("her sınıftan en az bir karakter (büyük/küçük/rakam/sembol)", () => {
    const p = generateTempPassword();
    expect(/[A-Z]/.test(p)).toBe(true);
    expect(/[a-z]/.test(p)).toBe(true);
    expect(/[0-9]/.test(p)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(p)).toBe(true);
  });
  it("ardışık çağrılar farklı", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/temp-password.test.ts`
Expected: FAIL.

- [ ] **Step 3: `lib/temp-password.ts` yaz**
```ts
import { randomInt } from "crypto";

const UP = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LO = "abcdefghijkmnpqrstuvwxyz";
const NU = "23456789";
const SY = "!@#$%*?";
const ALL = UP + LO + NU + SY;

function pick(set: string): string {
  return set[randomInt(set.length)];
}

/** Büyük/küçük/rakam/sembolden en az birer içeren karışık geçici şifre. */
export function generateTempPassword(len = 12): string {
  const n = Math.max(8, len);
  const chars = [pick(UP), pick(LO), pick(NU), pick(SY)];
  while (chars.length < n) chars.push(pick(ALL));
  // Fisher-Yates karıştır
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
```

- [ ] **Step 4: Pass + tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/temp-password.test.ts && npx tsc --noEmit`
Expected: PASS; Exit 0.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/temp-password.ts tests/unit/temp-password.test.ts
git commit -m "feat: generateTempPassword (TDD)"
```

---

## Task 3: onboardBranch action + OnboardForm + sayfa

**Files:** Modify `app/[locale]/admin/basvurular/actions.ts`, `app/[locale]/admin/basvurular/page.tsx`; Create `components/admin/OnboardForm.tsx`

- [ ] **Step 1: onboardBranch action**

`app/[locale]/admin/basvurular/actions.ts` — importlara ekle:
```ts
import bcrypt from "bcryptjs";
import { generateTempPassword } from "@/lib/temp-password";
```
Dosya SONUNA ekle:
```ts
export type OnboardState = { ok?: boolean; email?: string; tempPassword?: string; error?: string };

const clampStr = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function onboardBranch(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  await requireHQ();
  const applicationId = clampStr(formData.get("applicationId"), 64);
  const branchName = clampStr(formData.get("branchName"), 120);
  const adminEmail = clampStr(formData.get("adminEmail"), 160).toLowerCase();
  const adminName = clampStr(formData.get("adminName"), 120) || "Şube Yöneticisi";
  if (!applicationId || !branchName || !adminEmail) return { error: "Şube adı ve e-posta zorunlu" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) return { error: "Geçerli bir e-posta girin" };

  const existing = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
  if (existing) return { error: "Bu e-posta zaten kayıtlı" };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  try {
    const branch = await prisma.branch.create({ data: { name: branchName, isActive: true } });
    await prisma.user.create({
      data: { email: adminEmail, name: adminName, role: "BRANCH_ADMIN", branchId: branch.id, passwordHash },
    });
    await prisma.franchiseApplication.update({ where: { id: applicationId }, data: { status: "onboarded", branchId: branch.id } });
    revalidatePath("/admin/basvurular");
    return { ok: true, email: adminEmail, tempPassword };
  } catch {
    return { error: "Oluşturulamadı, tekrar deneyin" };
  }
}
```

- [ ] **Step 2: OnboardForm (client)**

`components/admin/OnboardForm.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { onboardBranch, type OnboardState } from "@/app/[locale]/admin/basvurular/actions";
import { SubmitButton } from "./SubmitButton";

const initial: OnboardState = {};

export function OnboardForm({ applicationId, defaultBranchName, defaultAdminName }: {
  applicationId: string; defaultBranchName: string; defaultAdminName: string;
}) {
  const [state, action] = useActionState(onboardBranch, initial);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-green-400/40 bg-green-400/5 p-3 text-sm">
        <p className="font-medium text-green-400">Şube oluşturuldu ✓</p>
        <p className="mt-1 text-cream/80">Giriş: <span className="text-gold">{state.email}</span></p>
        <p className="text-cream/80">Geçici şifre: <span className="select-all font-mono text-gold">{state.tempPassword}</span></p>
        <p className="mt-1 text-xs text-amber-400">Bu şifreyi şimdi kaydedin/iletin — tekrar gösterilmez.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-copper/30 p-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input name="branchName" defaultValue={defaultBranchName} placeholder="Şube adı"
        className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
      <input name="adminEmail" type="email" required placeholder="Yönetici e-posta *"
        className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
      <input name="adminName" defaultValue={defaultAdminName} placeholder="Yönetici adı"
        className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      <SubmitButton>🏪 Şube Oluştur</SubmitButton>
    </form>
  );
}
```

- [ ] **Step 3: basvurular sayfası**

`app/[locale]/admin/basvurular/page.tsx` (READ first):
- STATUS map'e ekle: `onboarded: { label: "Şube açıldı", cls: "text-green-400" },`
- import: `import { OnboardForm } from "@/components/admin/OnboardForm";`
- Her başvuru `<li>`'sinde, sağ aksiyon alanına: `a.branchId` doluysa rozet, değilse OnboardForm:
```tsx
              {a.branchId ? (
                <span className="rounded bg-green-400/15 px-3 py-1 text-sm text-green-400">🏪 {a.branch?.name ?? "Şube"}</span>
              ) : (
                <OnboardForm
                  applicationId={a.id}
                  defaultBranchName={`Kunefe House ${a.city}`}
                  defaultAdminName={a.name}
                />
              )}
```
(`a.branch` getApplications include'undan gelir; `a.city`/`a.name` mevcut alanlar.)

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/basvurular" components/admin/OnboardForm.tsx
git commit -m "feat(admin): franchise onboarding (başvuru→şube+kullanıcı, geçici şifre)"
```

---

## Task 4: Tam doğrulama + build + deploy

- [ ] **Step 1: testler + tsc + build**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error" | head`
Expected: PASS; Exit 0; build başarılı.

- [ ] **Step 2: Manuel doğrulama (dev)**
- HQ /admin/basvurular → bir başvuruda "Şube Oluştur" formu; e-posta gir → Branch + kullanıcı oluşur; **e-posta + geçici şifre bir kez gösterilir**; başvuru "Şube açıldı" + 🏪 rozeti.
- O e-posta/geçici şifreyle giriş → yalnız o şube (Faz 0 kapsama); Kullanıcılar'da görünür; Şubeler'de yeni şube.
- Aynı e-posta tekrar → "zaten kayıtlı" hatası, şube oluşmaz.
- Şube yöneticisi /admin/basvurular'a giremez (requireHQ).

- [ ] **Step 3: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`.)

---

## Self-Review Notları
- **Spec kapsamı:** FranchiseApplication.branchId+migration (T1), generateTempPassword TDD (T2), onboardBranch+OnboardForm+sayfa (T3), doğrulama (T4). Tümü karşılandı.
- **Tip tutarlılığı:** `OnboardState` action↔OnboardForm birebir. generateTempPassword imzası. getApplications include branch → sayfada `a.branch?.name`. Role "BRANCH_ADMIN" string (Faz 0 enum).
- **Güvenlik:** requireHQ; e-posta önce kontrol (çakışmada şube oluşmaz); bcrypt; düz şifre yalnız sonuçta bir kez. crypto.randomInt (Math.random değil).
- **Placeholder yok:** tam kod.
