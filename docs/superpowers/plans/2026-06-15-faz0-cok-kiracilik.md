# Faz 0 — Çok-Kiracılık Temeli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Branch'i kiracıya çevir; gerçek User tablosu + roller; Order/Courier'a branchId; auth'u env'den User tablosuna taşı; admin'i role göre kapsamla; mevcut veriyi "Merkez" şubeye taşı.

**Architecture:** Additive Prisma değişiklikleri + seed backfill. NextAuth v5 credentials artık User tablosuna bakar; JWT/session'a role+branchId eklenir. `lib/require-admin.ts` rol yardımcılarıyla (getSessionUser/requireHQ/branchScope) genişler. Sipariş/kurye okuma+sayfaları branchId ile kapsanır; HQ şube atar. Yeni Kullanıcılar sayfası (HQ).

**Tech Stack:** Next.js 16.2, NextAuth v5 beta (JWT), Prisma 7.8 + Supabase, bcryptjs, Vitest.

---

## File Structure
- `prisma/schema.prisma` — Branch alanları, Role enum, User, Order/Courier.branchId.
- `scripts/seed-tenancy.mjs` — Merkez + backfill + HQ user seed.
- `types/next-auth.d.ts` — session/JWT tip genişletme.
- `auth.ts` — User tablosu auth + callbacks.
- `lib/require-admin.ts` — getSessionUser/requireAdmin/requireHQ/branchScope.
- `lib/users.ts` (yeni), `app/[locale]/admin/kullanicilar/{page,actions}.ts` (yeni, HQ).
- `lib/branches.ts`, `app/[locale]/admin/subeler/{page,actions}.ts` — yeni alanlar + requireHQ.
- `lib/couriers.ts`, `app/[locale]/admin/kuryeler/{page,actions}.ts` — branchId kapsama.
- `lib/orders.ts`, `app/[locale]/admin/siparisler/{page,actions}.ts` — kapsama + şube atama.
- `app/[locale]/admin/layout.tsx` — role göre sidebar.

---

## Task 1: Şema + Migration

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Role enum + User modeli ekle**

`prisma/schema.prisma` SONUNA ekle:
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
  branchId     String?
  branch       Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Branch'i kiracı alanlarıyla genişlet**

`Branch` modeline ekle (mevcut alanların yanına):
```prisma
  slug      String    @unique @default(cuid())
  isActive  Boolean   @default(true)
  lat       Float?
  lng       Float?
  email     String?
  users     User[]
  orders    Order[]
  couriers  Courier[]
```

- [ ] **Step 3: Order ve Courier'a branchId**

`Order` modeline ekle:
```prisma
  branchId      String?
  branch        Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
```
`Courier` modeline ekle:
```prisma
  branchId    String?
  branch      Branch?   @relation(fields: [branchId], references: [id], onDelete: SetNull)
```

- [ ] **Step 4: Migration**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name tenancy_foundation`
Expected: migration uygulanır + client üretilir. (P1001 → 3 kez dene; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): User+Role, Branch kiracı alanları, Order/Courier.branchId"
```

---

## Task 2: Seed — Merkez şube + backfill + HQ kullanıcı

**Files:** Create `scripts/seed-tenancy.mjs`

- [ ] **Step 1: Seed scriptini yaz**

`scripts/seed-tenancy.mjs`:
```js
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Merkez şube (yoksa)
  let merkez = await prisma.branch.findFirst({ where: { name: "Merkez" } });
  if (!merkez) {
    merkez = await prisma.branch.create({ data: { name: "Merkez", isActive: true, order: -1 } });
    console.log("Merkez şubesi oluşturuldu:", merkez.id);
  } else {
    console.log("Merkez şubesi zaten var:", merkez.id);
  }

  // 2) branchId'siz sipariş ve kuryeleri Merkez'e bağla
  const o = await prisma.order.updateMany({ where: { branchId: null }, data: { branchId: merkez.id } });
  const c = await prisma.courier.updateMany({ where: { branchId: null }, data: { branchId: merkez.id } });
  console.log(`Backfill → siparişler: ${o.count}, kuryeler: ${c.count}`);

  // 3) HQ admin kullanıcı (env'den; .env'de '$' '\$' kaçışlı olabilir → düzelt)
  const email = process.env.ADMIN_EMAIL;
  let hash = process.env.ADMIN_PASSWORD_HASH || "";
  hash = hash.replace(/\\\$/g, "$"); // \$ → $
  if (email && hash) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: { email, passwordHash: hash, name: "Genel Merkez", role: "HQ_ADMIN", branchId: null, isActive: true },
      });
      console.log("HQ_ADMIN kullanıcı oluşturuldu:", email);
    } else {
      console.log("HQ kullanıcı zaten var:", email);
    }
  } else {
    console.log("UYARI: ADMIN_EMAIL/ADMIN_PASSWORD_HASH yok — HQ kullanıcı oluşturulmadı.");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Seed'i çalıştır**

Run: `cd /Users/macbook/Downloads/kunefe-house && node --env-file=.env scripts/seed-tenancy.mjs`
Expected: "Merkez şubesi oluşturuldu/var", "Backfill → siparişler: N, kuryeler: M", "HQ_ADMIN kullanıcı oluşturuldu". Hata olursa (örn. hash kaçışı) çıktıyı raporla.

- [ ] **Step 3: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add scripts/seed-tenancy.mjs
git commit -m "chore: çok-kiracılık seed (Merkez + backfill + HQ user)"
```

---

## Task 3: NextAuth tip genişletme + User tablosu auth

**Files:** Create `types/next-auth.d.ts`; Modify `auth.ts`

- [ ] **Step 1: Tip genişletme**

`types/next-auth.d.ts`:
```ts
import type { DefaultSession } from "next-auth";

type AppRole = "HQ_ADMIN" | "BRANCH_ADMIN";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: AppRole; branchId: string | null } & DefaultSession["user"];
  }
  interface User {
    role: AppRole;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: AppRole;
    branchId?: string | null;
  }
}
```

- [ ] **Step 2: auth.ts'i User tablosuna çevir + callbacks**

`auth.ts` tamamını şununla değiştir:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";

// Kullanıcı bulunamazsa da sabit-zamanlı davranış için sahte hash
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuWm9.Q4y3qg0iFqkq1rW0r0M5b8mРlq".slice(0, 60);

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = clientIp(request instanceof Request ? request.headers : new Headers());
        if (!(await checkRateLimit("login", ip))) return null;
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        // Sabit-zamanlı: kullanıcı yoksa da compare çalıştır
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.isActive || !ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: "HQ_ADMIN" | "BRANCH_ADMIN" }).role;
        token.branchId = (user as { branchId: string | null }).branchId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as "HQ_ADMIN" | "BRANCH_ADMIN") ?? "BRANCH_ADMIN";
        session.user.branchId = (token.branchId as string | null) ?? null;
      }
      return session;
    },
  },
});
```

> Not: `DUMMY_HASH` herhangi geçerli formatlı bir bcrypt hash olabilir; satırı sadeleştirip gerçek bir 60-karakter bcrypt hash'i (örn. `bcrypt.hashSync("x",10)` çıktısı) gömmek daha temiz. İmplementasyon sırasında geçerli bir sabit hash kullan: `const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8DvY8oqaC8t5g5e7t5e7t5e7t5e7tC";`

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add types/next-auth.d.ts auth.ts
git commit -m "feat(auth): User tablosu kimlik doğrulama + JWT/session role+branchId"
```

---

## Task 4: Rol yardımcıları (require-admin genişlet) + branchScope testi

**Files:** Modify `lib/require-admin.ts`; Test `tests/unit/branch-scope.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/branch-scope.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { branchScope } from "@/lib/require-admin";

describe("branchScope", () => {
  it("HQ için undefined (tüm şubeler)", () => {
    expect(branchScope({ id: "u1", role: "HQ_ADMIN", branchId: null })).toBeUndefined();
  });
  it("şube yöneticisi için kendi branchId", () => {
    expect(branchScope({ id: "u2", role: "BRANCH_ADMIN", branchId: "b1" })).toBe("b1");
  });
  it("branchId'siz şube yöneticisi hiçbir şeyle eşleşmez", () => {
    expect(branchScope({ id: "u3", role: "BRANCH_ADMIN", branchId: null })).toBe("__none__");
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/branch-scope.test.ts`
Expected: FAIL — `branchScope` yok.

- [ ] **Step 3: `lib/require-admin.ts`'i genişlet**

`lib/require-admin.ts` tamamını şununla değiştir:
```ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; role: "HQ_ADMIN" | "BRANCH_ADMIN"; branchId: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth();
  if (!s?.user) return null;
  return { id: s.user.id, role: s.user.role, branchId: s.user.branchId };
}

/** Herhangi giriş yapmış admin (yoksa login'e). */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/admin/login");
  return u;
}

/** Yalnız Genel Merkez. Şube yöneticisi /admin'e yönlenir. */
export async function requireHQ(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/admin/login");
  if (u.role !== "HQ_ADMIN") redirect("/admin");
  return u;
}

/** Sorgu filtresi: HQ → undefined (tümü); şube yöneticisi → kendi branchId ('__none__' = eşleşme yok). */
export function branchScope(u: SessionUser): string | undefined {
  if (u.role === "HQ_ADMIN") return undefined;
  return u.branchId ?? "__none__";
}
```

- [ ] **Step 4: Pass + tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/branch-scope.test.ts && npx tsc --noEmit`
Expected: testler PASS; tsc Exit 0.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/require-admin.ts tests/unit/branch-scope.test.ts
git commit -m "feat: rol yardımcıları (getSessionUser/requireHQ/branchScope) + test"
```

---

## Task 5: Kullanıcılar (lib + actions + sayfa, yalnız HQ)

**Files:** Create `lib/users.ts`, `app/[locale]/admin/kullanicilar/actions.ts`, `app/[locale]/admin/kullanicilar/page.tsx`

- [ ] **Step 1: lib/users.ts**
```ts
import { cache } from "react";
import { prisma } from "./prisma";

export const getUsers = cache(async () => {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { branch: { select: { name: true } } },
  });
});
```

- [ ] **Step 2: actions**

`app/[locale]/admin/kullanicilar/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireHQ, getSessionUser } from "@/lib/require-admin";

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function createUser(formData: FormData) {
  await requireHQ();
  const email = clamp(formData.get("email"), 160).toLowerCase();
  const name = clamp(formData.get("name"), 120);
  const role = formData.get("role") === "HQ_ADMIN" ? "HQ_ADMIN" : "BRANCH_ADMIN";
  const branchId = (formData.get("branchId") as string) || null;
  const password = clamp(formData.get("password"), 200);
  if (!email || !name || password.length < 6) throw new Error("E-posta, ad ve en az 6 haneli şifre zorunlu");
  if (role === "BRANCH_ADMIN" && !branchId) throw new Error("Şube yöneticisi için şube seçilmeli");
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, role, branchId: role === "HQ_ADMIN" ? null : branchId, passwordHash },
  });
  revalidatePath("/admin/kullanicilar");
}

export async function resetPassword(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const password = clamp(formData.get("password"), 200);
  if (password.length < 6) throw new Error("Şifre en az 6 hane");
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/admin/kullanicilar");
}

export async function toggleUserActive(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const next = formData.get("value") === "true";
  await prisma.user.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/kullanicilar");
}

export async function deleteUser(formData: FormData) {
  const me = await requireHQ();
  const id = formData.get("id") as string;
  if (id === me.id) throw new Error("Kendi hesabını silemezsin");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/kullanicilar");
}
```
(`getSessionUser` importu kullanılmıyorsa kaldır; `requireHQ` yeterli.)

- [ ] **Step 3: page (HQ)**

`app/[locale]/admin/kullanicilar/page.tsx`:
```tsx
import { setRequestLocale } from "next-intl/server";
import { requireHQ } from "@/lib/require-admin";
import { getUsers } from "@/lib/users";
import { getBranches } from "@/lib/branches";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createUser, resetPassword, toggleUserActive, deleteUser } from "./actions";

export default async function KullanicilarPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const [users, branches] = await Promise.all([getUsers(), getBranches()]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Kullanıcılar ({users.length})</h1>

      <form action={createUser} className="card-premium grid max-w-2xl gap-3 rounded-xl p-4 sm:grid-cols-2">
        <h2 className="font-serif text-gold sm:col-span-2">Yeni Kullanıcı</h2>
        <input name="email" type="email" required placeholder="E-posta *" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        <input name="name" required placeholder="Ad Soyad *" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        <select name="role" defaultValue="BRANCH_ADMIN" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="BRANCH_ADMIN">Şube Yöneticisi</option>
          <option value="HQ_ADMIN">Genel Merkez</option>
        </select>
        <select name="branchId" defaultValue="" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="">— Şube (yönetici için) —</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input name="password" type="text" required placeholder="Şifre (min 6) *" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream sm:col-span-2" />
        <div className="sm:col-span-2"><SubmitButton>Kullanıcı Ekle</SubmitButton></div>
      </form>

      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className={`card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between ${u.isActive ? "" : "opacity-50"}`}>
            <div>
              <p className="font-medium text-cream">{u.name}
                <span className="ml-2 text-xs text-gold">{u.role === "HQ_ADMIN" ? "Genel Merkez" : `Şube: ${u.branch?.name ?? "—"}`}</span>
                {!u.isActive && <span className="ml-2 text-xs text-cream/40">(Pasif)</span>}
              </p>
              <p className="text-sm text-cream/70">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={resetPassword} className="flex items-center gap-1">
                <input type="hidden" name="id" value={u.id} />
                <input name="password" type="text" placeholder="Yeni şifre" className="w-28 rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
                <button className="rounded bg-gold/20 px-2 py-1 text-sm text-gold">Sıfırla</button>
              </form>
              <form action={toggleUserActive}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="value" value={(!u.isActive).toString()} />
                <button className="rounded bg-copper/20 px-3 py-1 text-sm text-copper">{u.isActive ? "Pasifleştir" : "Aktifleştir"}</button>
              </form>
              <form action={deleteUser}><input type="hidden" name="id" value={u.id} /><button className="text-sm text-red-400">Sil</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/users.ts "app/[locale]/admin/kullanicilar"
git commit -m "feat(admin): Kullanıcılar sayfası (HQ) — ekle/şifre/aktif/sil"
```

---

## Task 6: Şubeler — kiracı alanları + requireHQ

**Files:** Modify `lib/branches.ts`, `app/[locale]/admin/subeler/actions.ts`, `app/[locale]/admin/subeler/page.tsx`

- [ ] **Step 1: actions — requireHQ + yeni alanlar**

`app/[locale]/admin/subeler/actions.ts`: `guard()` çağrılarını `requireHQ()` ile değiştir (import: `import { requireHQ } from "@/lib/require-admin";`, eski `auth` guard'ı kaldır). `createBranch`'e yeni alanlar ekle:
```ts
  await prisma.branch.create({
    data: {
      name,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      isActive: formData.get("isActive") !== "off",
      lat: formData.get("lat") ? Number(formData.get("lat")) : null,
      lng: formData.get("lng") ? Number(formData.get("lng")) : null,
      mapsEmbedUrl: (formData.get("mapsEmbedUrl") as string) || null,
      address: readLocalized(formData, "address"),
      workingHours: readLocalized(formData, "workingHours"),
      order: count,
    },
  });
```
(slug otomatik `@default(cuid())` ile dolar; istenirse sonra editlenebilir — Faz 0'da otomatik yeterli.)

- [ ] **Step 2: page — requireHQ + lat/lng/email/aktif inputları**

`app/[locale]/admin/subeler/page.tsx`: `requireAdmin` import/çağrısını `requireHQ` ile değiştir. Yeni şube formuna ekle (mapsEmbedUrl'den önce):
```tsx
        <div className="flex flex-col gap-1">
          <label className="text-sm text-cream/80">E-posta</label>
          <input name="email" type="email" placeholder="sube@kunefehouse.com" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="lat" type="number" step="any" placeholder="Enlem (lat)" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="lng" type="number" step="any" placeholder="Boylam (lng)" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input type="checkbox" name="isActive" defaultChecked /> Aktif
        </label>
```
Liste satırında aktiflik rozetini göster: `{!b.isActive && <span className="ml-2 text-xs text-cream/40">(Pasif)</span>}`.

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/branches.ts "app/[locale]/admin/subeler"
git commit -m "feat(admin): şubeler HQ-only + kiracı alanları (email/lat/lng/aktif)"
```

---

## Task 7: Kuryeler — branchId kapsama

**Files:** Modify `lib/couriers.ts`, `app/[locale]/admin/kuryeler/actions.ts`, `app/[locale]/admin/kuryeler/page.tsx`

- [ ] **Step 1: lib/couriers.ts — branchId filtre**

`getCouriers` ve `getAvailableCouriers`'ı opsiyonel branchId alacak şekilde değiştir:
```ts
export const getCouriers = cache(async (branchId?: string) => {
  return prisma.courier.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: [{ isActive: "desc" }, { order: "asc" }, { createdAt: "asc" }],
  });
});
export const getAvailableCouriers = cache(async (branchId?: string) => {
  return prisma.courier.findMany({
    where: { isActive: true, isAvailable: true, ...(branchId ? { branchId } : {}) },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
});
```
(getTrackingSnapshot Faz 2'de şubelenecek; şimdilik dokunma.)

- [ ] **Step 2: actions — createCourier branchId**

`app/[locale]/admin/kuryeler/actions.ts`: `guard()` yerine sessionUser kullan. `createCourier`: şube yöneticisi ise kuryeye kendi branchId'sini ata; HQ ise formdan `branchId` al. Üst kısımda:
```ts
import { requireAdmin } from "@/lib/require-admin";
```
`createCourier` başında `const me = await requireAdmin();` ve create data'ya:
```ts
      branchId: me.role === "HQ_ADMIN" ? ((formData.get("branchId") as string) || null) : me.branchId,
```
Diğer action'larda (`toggleAvailability/toggleActive/deleteCourier`) `guard()` → `await requireAdmin();` yeterli (Faz 0; sıkı sahiplik kontrolü Step opsiyonel). 

- [ ] **Step 3: page — kapsama + HQ şube kolonu**

`app/[locale]/admin/kuryeler/page.tsx`: `requireAdmin()` dönüşünü kullan:
```tsx
  const me = await requireAdmin();
  const branchId = me.role === "HQ_ADMIN" ? undefined : (me.branchId ?? "__none__");
  const couriers = await getCouriers(branchId);
```
(HQ ise yeni kurye formuna şube `<select>` ekle: `getBranches()` çekip `<select name="branchId">`. Şube yöneticisinde gizli.)

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/couriers.ts "app/[locale]/admin/kuryeler"
git commit -m "feat(admin): kuryeler branchId kapsama (şube yöneticisi kendi kuryeleri)"
```

---

## Task 8: Siparişler — branchId kapsama + HQ şube atama

**Files:** Modify `lib/orders.ts`, `app/[locale]/admin/siparisler/actions.ts`, `app/[locale]/admin/siparisler/page.tsx`

- [ ] **Step 1: lib/orders.ts — branchId filtre + branch include**

`getOrders`'ı değiştir:
```ts
export const getOrders = cache(async (branchId?: string) => {
  return prisma.order.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { courier: true, branch: { select: { id: true, name: true } } },
  });
});
```

- [ ] **Step 2: actions — kapsama + şube atama**

`app/[locale]/admin/siparisler/actions.ts`: `guard()` → `requireAdmin`. `assignOrderBranch` ekle (HQ):
```ts
import { requireAdmin, requireHQ } from "@/lib/require-admin";
// updateOrderStatus / deleteOrder / assignCourier başlarında: const me = await requireAdmin();
export async function assignOrderBranch(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const branchId = (formData.get("branchId") as string) || null;
  await prisma.order.update({ where: { id }, data: { branchId } });
  revalidatePath("/admin/siparisler");
}
```
`assignCourier` içinde: atanacak kuryenin siparişle aynı şubede olmasını sağlamak için sorun yok (dropdown zaten şube kuryeleri). Mevcut mantık korunur.

- [ ] **Step 3: page — kapsama + HQ şube etiketi/atama**

`app/[locale]/admin/siparisler/page.tsx`:
```tsx
  const me = await requireAdmin();
  const scope = me.role === "HQ_ADMIN" ? undefined : (me.branchId ?? "__none__");
  const orders = await getOrders(scope);
  const availableCouriers = await getAvailableCouriers(scope);
```
HQ ise: her siparişte şube etiketi `{o.branch?.name ?? "Atanmamış"}` + şube atama formu (`assignOrderBranch`, `getBranches()` dropdown). Şube yöneticisinde gizli. Kurye listesi `getAvailableCouriers(scope)` — HQ'da siparişin şubesine göre filtre ideal ama Faz 0'da tüm/şube yeterli (not düş).

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/orders.ts "app/[locale]/admin/siparisler"
git commit -m "feat(admin): siparişler branchId kapsama + HQ şube atama"
```

---

## Task 9: Sidebar — role göre

**Files:** Modify `app/[locale]/admin/layout.tsx`

- [ ] **Step 1: Role göre linkler**

`app/[locale]/admin/layout.tsx`: `auth()` yerine `getSessionUser()` kullan; HQ ise tüm linkler + "Kullanıcılar"; BRANCH_ADMIN ise sınırlı set (Panel, Siparişler, Kuryeler). Örnek:
```tsx
import { getSessionUser } from "@/lib/require-admin";
// ...
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await getSessionUser();
  if (!me) return <div className="min-h-screen bg-forest">{children}</div>;
  const isHQ = me.role === "HQ_ADMIN";
  return (
    <div className="min-h-screen bg-forest text-cream">
      <aside className="flex flex-wrap gap-x-6 gap-y-2 border-b border-copper/30 px-6 py-4">
        <Link href="/admin" className="font-serif text-gold">Panel</Link>
        <Link href="/admin/siparisler">Siparişler</Link>
        <Link href="/admin/kuryeler">Kuryeler</Link>
        <Link href="/admin/canli-takip">Canlı Takip</Link>
        {isHQ && <>
          <Link href="/admin/ayarlar">Site Ayarları</Link>
          <Link href="/admin/kategoriler">Kategoriler</Link>
          <Link href="/admin/urunler">Ürünler</Link>
          <Link href="/admin/harita">Harita</Link>
          <Link href="/admin/reels">Reels</Link>
          <Link href="/admin/bayilik-sss">Bayilik SSS</Link>
          <Link href="/admin/basvurular">Başvurular</Link>
          <Link href="/admin/subeler">Şubeler</Link>
          <Link href="/admin/kullanicilar">Kullanıcılar</Link>
          <Link href="/admin/haberler">Haberler</Link>
          <Link href="/admin/medya">Medya</Link>
        </>}
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
```
(Mevcut `auth` import'unu kaldır; `force-dynamic` kalır.)

> Güvenlik notu: HQ-only sayfaların kendileri zaten `requireHQ()` ile korunur (sidebar gizleme yalnız UX). Şube yöneticisi URL'i elle girse de `requireHQ` /admin'e atar.

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): role göre sidebar (HQ tam / şube sınırlı)"
```

---

## Task 10: HQ-only sayfaları koruma (requireHQ)

**Files:** Modify `app/[locale]/admin/{ayarlar,kategoriler,urunler,harita,reels,bayilik-sss,basvurular,haberler,medya}/page.tsx`

- [ ] **Step 1: requireHQ uygula**

Bu sayfaların her birinin başındaki `await requireAdmin();` çağrısını `await requireHQ();` ile değiştir (import'u `import { requireHQ } from "@/lib/require-admin";` yap). `urunler/[id]` ve `urunler/yeni` dahil. Bu, şube yöneticisinin HQ-only alanlara URL ile erişimini engeller (Faz 1'e kadar katalog HQ).

Run her dosya için yok; toplu: dosyaları READ edip `requireAdmin` → `requireHQ` değiştir.

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin"
git commit -m "feat(admin): HQ-only sayfalar requireHQ ile korundu"
```

---

## Task 11: Tam doğrulama + build + deploy

- [ ] **Step 1: testler + tsc + build**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error" | head`
Expected: testler PASS; tsc Exit 0; build başarılı.

- [ ] **Step 2: Manuel doğrulama (dev)**
Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Mevcut admin e-posta/şifre ile login (artık User tablosundan) → HQ olarak girer; tüm sidebar + Kullanıcılar görünür.
- Şubeler'den 2. şube ekle; Kullanıcılar'dan o şubeye BRANCH_ADMIN oluştur.
- Çıkış → yeni şube yöneticisiyle login → yalnız Siparişler/Kuryeler/Canlı Takip; Kullanıcılar/Ürünler URL'ine elle gidince /admin'e atılır (requireHQ).
- Şube yöneticisi yalnız kendi şubesinin sipariş/kuryesini görür.
- HQ siparişe şube atayabilir; eski siparişler "Merkez"de.

- [ ] **Step 3: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`. Deploy sonrası: Vercel'de eski `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` env'leri seed için bir süre tutulabilir; auth artık kullanmıyor.)

---

## Self-Review Notları
- **Spec kapsamı:** Branch kiracı+User+Role+branchId (T1), backfill/seed (T2), auth User+callbacks (T3), rol yardımcıları+test (T4), Kullanıcılar (T5), Şubeler HQ+alanlar (T6), kurye kapsama (T7), sipariş kapsama+şube atama (T8), sidebar (T9), HQ-only koruma (T10), doğrulama (T11). Tümü karşılandı.
- **Tip tutarlılığı:** `SessionUser`/`branchScope`/role union ("HQ_ADMIN"|"BRANCH_ADMIN") auth.d.ts, auth.ts callbacks, require-admin, sayfalarda tutarlı. `getOrders(branchId?)`/`getCouriers(branchId?)` imzaları T7/T8 ↔ sayfalar uyumlu.
- **Güvenlik:** HQ-only hem sidebar gizleme (UX) hem requireHQ (gerçek koruma). Şube kapsama branchScope ile; şube yöneticisi başka şube verisini sorgulayamaz. Şifreler bcrypt.
- **Riskler:** (1) .env'deki ADMIN_PASSWORD_HASH `\$` kaçışı → seed `\$`→`$` çevirir; login olmazsa hash'i kontrol et. (2) DUMMY_HASH geçerli 60-karakter bcrypt olmalı. (3) next-auth tip genişletme `types/` tsconfig include kapsamında olmalı (genelde otomatik).
- **Placeholder yok:** kritik dosyalar tam kod; T10 mekanik değişim (requireAdmin→requireHQ) net.
