# Kunefe House — Faz 2: Veri Modeli, Admin Auth & Site Ayarları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tüm içerik koleksiyonları için çalışan bir PostgreSQL veri modeli kurmak; NextAuth credentials ile korumalı bir `/admin` alanı oluşturmak; admin'in düzenleyip public site'ın okuduğu SiteSettings (WhatsApp no, sosyal linkler, hero metinleri) singleton'ını uçtan uca çalıştırmak.

**Architecture:** Prisma 7 + bulut PostgreSQL (Neon/Supabase), `@prisma/adapter-pg` driver adapter ile. Çok dilli metinler `Json` alanlarda `{ tr, en, ar }` konvansiyonuyla; `localize()` yardımcısı ile okunur. Auth: NextAuth v5 (Auth.js) credentials provider + JWT session; admin şifresi env'de bcrypt hash. `/admin/*` rotaları middleware/proxy + layout guard ile korunur. SiteSettings tek satır (singleton) — public site server component'lerde okunur.

**Tech Stack:** Prisma 7, @prisma/adapter-pg, pg, next-auth@beta (v5), bcryptjs, zod (form doğrulama), Next.js 16, next-intl 4.13.

**Spec:** `docs/superpowers/specs/2026-06-08-kunefe-house-design.md`

**Önkoşul (insan):** Çalışan bir bulut PostgreSQL `DATABASE_URL` (Neon/Supabase) `.env` dosyasına konmalı. Ayrıca `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `NEXT_PUBLIC_WHATSAPP_NUMBER` env değişkenleri (Görev 4'te üretilecek hash dahil).

---

## Dosya Yapısı (Faz 2 sonunda eklenenler)

```
kunefe-house/
├── prisma/
│   ├── schema.prisma          # tüm modeller
│   ├── migrations/            # ilk migration
│   └── seed.ts                # SiteSettings singleton + örnek veri
├── lib/
│   ├── prisma.ts              # Prisma 7 adapter ile güncellenmiş singleton
│   ├── i18n-field.ts          # localize() + LocalizedString tipi + zod şeması
│   └── settings.ts            # getSiteSettings() server helper (cache'li)
├── auth.ts                    # NextAuth yapılandırması (credentials, jwt)
├── app/
│   ├── api/auth/[...nextauth]/route.ts
│   ├── [locale]/admin/
│   │   ├── layout.tsx         # auth guard + admin shell
│   │   ├── page.tsx           # dashboard (özet)
│   │   ├── login/page.tsx     # giriş formu
│   │   └── ayarlar/
│   │       ├── page.tsx       # SiteSettings düzenleme formu (server)
│   │       └── actions.ts     # updateSettings server action
├── components/admin/
│   ├── LoginForm.tsx
│   ├── SettingsForm.tsx
│   └── LocalizedInput.tsx     # tr/en/ar sekmeli input
├── middleware.ts              # mevcut next-intl + admin koruması (veya proxy.ts)
├── tests/unit/
│   ├── i18n-field.test.ts
│   └── settings.test.ts
└── scripts/
    └── hash-password.mjs       # tek seferlik admin şifre hash üretici
```

---

## Görev 1: Çok Dilli Alan Yardımcısı (localize)

**Files:**
- Create: `lib/i18n-field.ts`
- Test: `tests/unit/i18n-field.test.ts`

- [ ] **Adım 1: Failing test yaz**

Create `tests/unit/i18n-field.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { localize, localizedStringSchema } from "@/lib/i18n-field";

describe("localize", () => {
  const field = { tr: "Künefe", en: "Kunefe", ar: "كنافة" };

  it("istenen dili döner", () => {
    expect(localize(field, "en")).toBe("Kunefe");
    expect(localize(field, "ar")).toBe("كنافة");
  });

  it("dil boşsa tr'ye fallback yapar", () => {
    expect(localize({ tr: "Künefe", en: "", ar: "" }, "en")).toBe("Künefe");
  });

  it("null alanda boş string döner", () => {
    expect(localize(null, "tr")).toBe("");
  });
});

describe("localizedStringSchema", () => {
  it("geçerli nesneyi kabul eder", () => {
    expect(() =>
      localizedStringSchema.parse({ tr: "a", en: "b", ar: "c" })
    ).not.toThrow();
  });

  it("tr zorunlu, eksikse hata verir", () => {
    expect(() => localizedStringSchema.parse({ tr: "", en: "b", ar: "c" })).toThrow();
  });
});
```

- [ ] **Adım 2: Çalıştır, başarısız olduğunu gör**

Run: `npm test -- i18n-field`
Expected: FAIL ("Cannot find module")

- [ ] **Adım 3: zod kur ve lib/i18n-field.ts oluştur**

```bash
npm install zod
```

Create `lib/i18n-field.ts`:

```typescript
import { z } from "zod";

export type Locale = "tr" | "en" | "ar";

export type LocalizedString = {
  tr: string;
  en: string;
  ar: string;
};

export const localizedStringSchema = z.object({
  tr: z.string().min(1, "Türkçe alan zorunludur"),
  en: z.string(),
  ar: z.string(),
});

export function localize(
  field: Partial<LocalizedString> | null | undefined,
  locale: Locale
): string {
  if (!field) return "";
  const value = field[locale];
  if (value && value.trim().length > 0) return value;
  return field.tr ?? "";
}
```

- [ ] **Adım 4: Çalıştır, geçtiğini gör**

Run: `npm test -- i18n-field`
Expected: PASS

- [ ] **Adım 5: Commit**

```bash
git add lib/i18n-field.ts tests/unit/i18n-field.test.ts package.json package-lock.json
git commit -m "feat: çok dilli alan yardımcısı (localize + zod şema)"
```

---

## Görev 2: Prisma Şeması — Tüm Modeller

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Adım 1: prisma/schema.prisma'ya tüm modelleri ekle**

`prisma/schema.prisma` içeriğini değiştir (generator + datasource korunur, modeller eklenir):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// Çok dilli metinler Json alanlarda { "tr": "...", "en": "...", "ar": "..." } olarak saklanır.

model SiteSettings {
  id              Int      @id @default(1)
  logoHeaderUrl   String?
  logoFooterUrl   String?
  faviconUrl      String?
  whatsappNumber  String?
  whatsappMessage Json?    // LocalizedString
  heroTitle       Json?    // LocalizedString
  heroSubtitle    Json?    // LocalizedString
  brandColors     Json?    // { forest, gold, copper, cream, pistachio }
  enabledLocales  String[] @default(["tr", "en", "ar"])
  updatedAt       DateTime @updatedAt
}

model SocialLink {
  id       String @id @default(cuid())
  platform String
  url      String
  order    Int    @default(0)
}

model ProductCategory {
  id       String    @id @default(cuid())
  name     Json      // LocalizedString
  slug     String    @unique
  order    Int       @default(0)
  products Product[]
}

model Product {
  id               String           @id @default(cuid())
  title            Json             // LocalizedString
  slug             String           @unique
  shortDescription Json?            // LocalizedString
  ingredients      Json?            // LocalizedString[] veya string[]
  nutritionInfo    Json?            // LocalizedString
  primaryImageUrl  String?
  secondaryImageUrl String?
  categoryId       String?
  category         ProductCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  featured         Boolean          @default(false)
  order            Int              @default(0)
  createdAt        DateTime         @default(now())
}

model MapPin {
  id          String  @id @default(cuid())
  cityName    String
  x           Float   // yüzde
  y           Float   // yüzde
  ingredient  Json    // LocalizedString
  popupTitle  Json?   // LocalizedString
  popupBody   Json?   // LocalizedString
  popupMediaUrl String?
  order       Int     @default(0)
}

model Reel {
  id          String  @id @default(cuid())
  title       Json?   // LocalizedString
  coverUrl    String
  instagramUrl String
  order       Int     @default(0)
}

model Branch {
  id           String  @id @default(cuid())
  name         String
  address      Json?   // LocalizedString
  phone        String?
  mapsEmbedUrl String?
  workingHours Json?   // LocalizedString
  order        Int     @default(0)
}

model News {
  id        String   @id @default(cuid())
  title     Json     // LocalizedString
  body      Json?    // LocalizedString
  imageUrl  String?
  published Boolean  @default(false)
  asPopup   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model FranchiseFaq {
  id       String @id @default(cuid())
  question Json   // LocalizedString
  answer   Json   // LocalizedString
  order    Int    @default(0)
}

model FranchiseApplication {
  id        String   @id @default(cuid())
  name      String
  phone     String
  city      String
  budget    String?
  locationNote String?
  status    String   @default("new") // new | contacted | approved | rejected
  createdAt DateTime @default(now())
}

model PageContent {
  id      String @id @default(cuid())
  key     String @unique // örn "home.brandStory", "franchise.hero"
  content Json   // LocalizedString veya yapısal Json
}

model FreePage {
  id        String  @id @default(cuid())
  slug      String  @unique
  title     Json    // LocalizedString
  blocks    Json    // blok dizisi
  published Boolean @default(false)
}

model SeoMeta {
  id          String  @id @default(cuid())
  path        String  @unique // örn "/", "/bayilik"
  title       Json?   // LocalizedString
  description Json?   // LocalizedString
  ogImageUrl  String?
}
```

- [ ] **Adım 2: Şema formatını ve geçerliliğini doğrula**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

Run: `npx prisma format`
Expected: formatlanmış şema (hata yok).

- [ ] **Adım 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: tüm içerik modelleri (Prisma şeması)"
```

---

## Görev 3: Prisma 7 Driver Adapter + Migration

**Files:**
- Modify: `lib/prisma.ts`
- Modify: `prisma.config.ts`
- Create: `prisma/migrations/*` (generate)

**Not:** Bu görev `.env` içinde geçerli bir `DATABASE_URL` gerektirir. Yoksa BLOCKED bildir ve insandan iste.

- [ ] **Adım 1: Driver adapter paketlerini kur**

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

- [ ] **Adım 2: lib/prisma.ts'i adapter ile güncelle**

Replace `lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Adım 3: prisma.config.ts'in DATABASE_URL'i yüklediğini doğrula**

`prisma.config.ts` zaten `import "dotenv/config"` ve datasource url içeriyor olmalı (Faz 1). İçeriğini kontrol et; `migrations` ve `seed` için şu yapıda olduğundan emin ol:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
```

(Eğer Faz 1'deki dosya farklıysa, mevcut yapıyı koruyup yalnızca `migrations.seed` satırını ekle. `tsx` yoksa kur: `npm install -D tsx`.)

- [ ] **Adım 4: İlk migration'ı oluştur ve uygula**

Run: `npx prisma migrate dev --name init`
Expected: "migration ... applied", Prisma Client üretildi.

- [ ] **Adım 5: tsc ile doğrula**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Adım 6: Commit**

```bash
git add lib/prisma.ts prisma.config.ts prisma/migrations package.json package-lock.json
git commit -m "feat: Prisma 7 pg driver adapter + ilk migration"
```

---

## Görev 4: Admin Şifre Hash Üretici + Env

**Files:**
- Create: `scripts/hash-password.mjs`
- Modify: `.env.example`

- [ ] **Adım 1: bcryptjs kur**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Adım 2: scripts/hash-password.mjs oluştur**

```javascript
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Kullanım: node scripts/hash-password.mjs <şifre>");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
console.log(hash);
```

- [ ] **Adım 3: .env.example'ı güncelle**

`.env.example` içeriğini değiştir:

```
DATABASE_URL="postgresql://user:password@host:5432/kunefe_house?sslmode=require"
NEXT_PUBLIC_WHATSAPP_NUMBER="905555555555"
AUTH_SECRET="openssl rand -base64 33 ile üret"
ADMIN_EMAIL="admin@kunefehouse.com"
ADMIN_PASSWORD_HASH="node scripts/hash-password.mjs <şifre> ile üret"
```

- [ ] **Adım 4: Script'i test et (örnek şifre ile)**

Run: `node scripts/hash-password.mjs test123`
Expected: `$2a$...` ile başlayan bir hash satırı.

- [ ] **Adım 5: Commit**

```bash
git add scripts/hash-password.mjs .env.example package.json package-lock.json
git commit -m "feat: admin şifre hash üretici + env şablonu"
```

---

## Görev 5: NextAuth Credentials Yapılandırması

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

**Not (insan):** Çalıştırmadan önce `.env` içine `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` konmalı. Hash, Görev 4 scripti ile üretilir.

- [ ] **Adım 1: next-auth v5 kur**

```bash
npm install next-auth@beta
```

- [ ] **Adım 2: auth.ts oluştur**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminHash) return null;
        if (email !== adminEmail) return null;

        const valid = await bcrypt.compare(password, adminHash);
        if (!valid) return null;

        return { id: "admin", email: adminEmail, name: "Admin" };
      },
    }),
  ],
});
```

- [ ] **Adım 3: app/api/auth/[...nextauth]/route.ts oluştur**

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Adım 4: tsc ile doğrula**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Adım 5: Commit**

```bash
git add auth.ts app/api/auth package.json package-lock.json
git commit -m "feat: NextAuth credentials auth (admin, JWT)"
```

---

## Görev 6: Admin Rota Koruması (middleware)

**Files:**
- Modify: `middleware.ts`

**Not:** Mevcut `middleware.ts` next-intl middleware'ini çalıştırıyor. Admin korumasını next-intl ile birleştir. (Next 16 `proxy` deprecation uyarısı bu görevde de görülür; ayrı bir migrasyon görevidir, şimdilik `middleware.ts` adıyla devam.)

- [ ] **Adım 1: middleware.ts'i auth kontrolü ile güncelle**

Replace `middleware.ts`:

```typescript
import createMiddleware from "next-intl/middleware";
import { NextRequestWithAuth } from "next-auth/middleware";
import { routing } from "./i18n/routing";
import { auth } from "./auth";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // /admin altındaki sayfalar (login hariç) korumalı
  const isAdmin = /^\/(tr|en|ar)?\/?admin(?!\/login)/.test(pathname) ||
    /^\/admin(?!\/login)/.test(pathname);
  const isLoggedIn = !!req.auth;

  if (isAdmin && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Not (uygulayıcı):** next-auth v5 `auth()` wrapper'ı ile next-intl middleware'ini sarmalamak sürüm-spesifik olabilir. Eğer `auth((req) => ...)` imzası veya `req.auth` bu sürümde farklıysa, gerçek API'ye uyarla: amaç (1) `/admin/*` (login hariç) için oturum yoksa `/admin/login`'e yönlendir, (2) diğer tüm rotalarda next-intl middleware'ini çalıştır. Yaklaşım çalışmıyorsa, admin korumasını Görev 7'deki admin `layout.tsx` içinde sunucu tarafı `auth()` ile yap ve middleware'i sadece next-intl olarak bırak; bunu DONE_WITH_CONCERNS ile bildir.

- [ ] **Adım 2: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme.

- [ ] **Adım 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: /admin rota koruması (middleware + auth)"
```

---

## Görev 7: Admin Giriş Sayfası & Admin Layout

**Files:**
- Create: `components/admin/LoginForm.tsx`
- Create: `app/[locale]/admin/login/page.tsx`
- Create: `app/[locale]/admin/layout.tsx`
- Create: `app/[locale]/admin/page.tsx`

- [ ] **Adım 1: LoginForm.tsx oluştur**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("E-posta veya şifre hatalı.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 flex max-w-sm flex-col gap-4 rounded-lg bg-forest-light p-8">
      <h1 className="font-serif text-2xl text-gold">Kunefe House Admin</h1>
      <input name="email" type="email" placeholder="E-posta" required
        className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="password" type="password" placeholder="Şifre" required
        className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={loading}
        className="rounded bg-gold px-4 py-2 font-medium text-forest disabled:opacity-50">
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
```

- [ ] **Adım 2: login/page.tsx oluştur**

```tsx
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginForm />;
}
```

- [ ] **Adım 3: admin/layout.tsx oluştur (sunucu tarafı guard + admin kabuğu)**

```tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  // login sayfası bu layout'un dışında değil; oturum yoksa login'e bırak.
  // (Login sayfası da bu layout'u kullanır; oturum yoksa sadece children göster.)
  if (!session) {
    return <div className="min-h-screen bg-forest">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-forest text-cream">
      <aside className="flex gap-6 border-b border-copper/30 px-6 py-4">
        <Link href="/admin" className="font-serif text-gold">Panel</Link>
        <Link href="/admin/ayarlar">Site Ayarları</Link>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

**Not:** Login sayfası oturum yokken `children` olarak render edilir; oturum varken admin kabuğu görünür. Middleware zaten `/admin` (login hariç) için yönlendirme yapar; layout guard ikinci savunma hattıdır.

- [ ] **Adım 4: admin/page.tsx (dashboard) oluştur**

```tsx
import { setRequestLocale } from "next-intl/server";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div>
      <h1 className="font-serif text-2xl text-gold">Yönetim Paneli</h1>
      <p className="mt-2 text-cream/70">Soldaki menüden bir bölüm seçin.</p>
    </div>
  );
}
```

- [ ] **Adım 5: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme; `/[locale]/admin` ve `/[locale]/admin/login` rotaları üretilir.

- [ ] **Adım 6: Commit**

```bash
git add app/[locale]/admin components/admin/LoginForm.tsx
git commit -m "feat: admin giriş sayfası + admin layout (guard)"
```

---

## Görev 8: SiteSettings Seed + getSiteSettings Helper

**Files:**
- Create: `prisma/seed.ts`
- Create: `lib/settings.ts`
- Test: `tests/unit/settings.test.ts`

- [ ] **Adım 1: prisma/seed.ts oluştur**

```typescript
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      whatsappNumber: "905555555555",
      whatsappMessage: { tr: "Merhaba, bilgi almak istiyorum.", en: "Hello, I would like info.", ar: "مرحباً، أود الحصول على معلومات." },
      heroTitle: { tr: "Gelenekten Geleceğe Uzanan Lezzet", en: "A Taste Bridging Tradition and Future", ar: "نكهة تمتد من التقاليد إلى المستقبل" },
      heroSubtitle: { tr: "", en: "", ar: "" },
      enabledLocales: ["tr", "en", "ar"],
    },
  });

  const socials = [
    { platform: "instagram", url: "https://instagram.com/kunefehouse", order: 0 },
  ];
  for (const s of socials) {
    await prisma.socialLink.upsert({
      where: { id: s.platform },
      update: { url: s.url, order: s.order },
      create: { id: s.platform, platform: s.platform, url: s.url, order: s.order },
    });
  }

  console.log("Seed tamamlandı.");
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Adım 2: lib/settings.ts oluştur**

```typescript
import { cache } from "react";
import { prisma } from "./prisma";

export const getSiteSettings = cache(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return settings;
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({ orderBy: { order: "asc" } });
});
```

- [ ] **Adım 3: settings.ts için test yaz (Prisma mock)**

Create `tests/unit/settings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: { findUnique },
    socialLink: { findMany },
  },
}));

import { getSiteSettings, getSocialLinks } from "@/lib/settings";

describe("getSiteSettings", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
  });

  it("id=1 singleton'ı okur", async () => {
    findUnique.mockResolvedValue({ id: 1, whatsappNumber: "905" });
    const s = await getSiteSettings();
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(s?.whatsappNumber).toBe("905");
  });

  it("sosyal linkleri sıraya göre döner", async () => {
    findMany.mockResolvedValue([{ id: "instagram", platform: "instagram", url: "x", order: 0 }]);
    const links = await getSocialLinks();
    expect(findMany).toHaveBeenCalledWith({ orderBy: { order: "asc" } });
    expect(links).toHaveLength(1);
  });
});
```

**Not:** `getSiteSettings` `cache()` ile sarılı; testte React cache her çağrıda yeni modül örneğiyle çalışır. Eğer cache testte aynı sonucu döndürüp ikinci testi etkilerse, `vi.resetModules()` kullanmadan iki ayrı çağrı farklı mock döndüremeyebilir. Bu durumda her testi `await vi.importActual` yerine ayrı tutmak için testleri tek `it` içinde sıralı çağır veya cache'i testte by-pass et — uygulayıcı pragmatik çözsün ve testin gerçek davranışı doğruladığından emin olsun.

- [ ] **Adım 4: Testi çalıştır**

Run: `npm test -- settings`
Expected: PASS

- [ ] **Adım 5: Seed'i çalıştır (gerçek DB gerekir)**

Run: `npx prisma db seed`
Expected: "Seed tamamlandı." — SiteSettings ve Instagram linki oluşturulur.

- [ ] **Adım 6: Commit**

```bash
git add prisma/seed.ts lib/settings.ts tests/unit/settings.test.ts
git commit -m "feat: SiteSettings seed + getSiteSettings/getSocialLinks helper"
```

---

## Görev 9: LocalizedInput Bileşeni (tr/en/ar sekmeli)

**Files:**
- Create: `components/admin/LocalizedInput.tsx`

- [ ] **Adım 1: LocalizedInput.tsx oluştur**

```tsx
"use client";

import { useState } from "react";

const LOCALES = ["tr", "en", "ar"] as const;
type Loc = (typeof LOCALES)[number];

export function LocalizedInput({
  name,
  label,
  defaultValue,
  multiline = false,
}: {
  name: string;
  label: string;
  defaultValue?: Partial<Record<Loc, string>> | null;
  multiline?: boolean;
}) {
  const [active, setActive] = useState<Loc>("tr");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-cream/80">{label}</label>
        <div className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setActive(l)}
              className={`rounded px-2 py-0.5 text-xs ${
                l === active ? "bg-gold text-forest" : "bg-forest text-cream/60"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {LOCALES.map((l) =>
        multiline ? (
          <textarea
            key={l}
            name={`${name}.${l}`}
            defaultValue={defaultValue?.[l] ?? ""}
            dir={l === "ar" ? "rtl" : "ltr"}
            className={`${l === active ? "block" : "hidden"} rounded border border-copper/40 bg-forest px-3 py-2 text-cream`}
            rows={4}
          />
        ) : (
          <input
            key={l}
            name={`${name}.${l}`}
            defaultValue={defaultValue?.[l] ?? ""}
            dir={l === "ar" ? "rtl" : "ltr"}
            className={`${l === active ? "block" : "hidden"} rounded border border-copper/40 bg-forest px-3 py-2 text-cream`}
          />
        )
      )}
    </div>
  );
}
```

- [ ] **Adım 2: tsc ile doğrula**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Adım 3: Commit**

```bash
git add components/admin/LocalizedInput.tsx
git commit -m "feat: çok dilli (tr/en/ar sekmeli) admin input bileşeni"
```

---

## Görev 10: SiteSettings Düzenleme (Server Action + Form)

**Files:**
- Create: `app/[locale]/admin/ayarlar/actions.ts`
- Create: `app/[locale]/admin/ayarlar/page.tsx`
- Create: `components/admin/SettingsForm.tsx`

- [ ] **Adım 1: actions.ts (updateSettings server action) oluştur**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function updateSettings(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");

  const whatsappNumber = (formData.get("whatsappNumber") as string) ?? "";
  const heroTitle = readLocalized(formData, "heroTitle");
  const heroSubtitle = readLocalized(formData, "heroSubtitle");
  const whatsappMessage = readLocalized(formData, "whatsappMessage");

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { whatsappNumber, heroTitle, heroSubtitle, whatsappMessage },
    create: { id: 1, whatsappNumber, heroTitle, heroSubtitle, whatsappMessage },
  });

  revalidatePath("/", "layout");
}
```

- [ ] **Adım 2: SettingsForm.tsx oluştur**

```tsx
import { LocalizedInput } from "./LocalizedInput";
import { updateSettings } from "@/app/[locale]/admin/ayarlar/actions";

type Settings = {
  whatsappNumber: string | null;
  heroTitle: Record<string, string> | null;
  heroSubtitle: Record<string, string> | null;
  whatsappMessage: Record<string, string> | null;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  return (
    <form action={updateSettings} className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">WhatsApp Numarası</label>
        <input
          name="whatsappNumber"
          defaultValue={settings?.whatsappNumber ?? ""}
          placeholder="905555555555"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream"
        />
      </div>
      <LocalizedInput name="whatsappMessage" label="WhatsApp Hazır Mesaj" defaultValue={settings?.whatsappMessage} multiline />
      <LocalizedInput name="heroTitle" label="Hero Başlık" defaultValue={settings?.heroTitle} />
      <LocalizedInput name="heroSubtitle" label="Hero Alt Başlık" defaultValue={settings?.heroSubtitle} />
      <button type="submit" className="self-start rounded bg-gold px-6 py-2 font-medium text-forest">
        Kaydet
      </button>
    </form>
  );
}
```

- [ ] **Adım 3: ayarlar/page.tsx oluştur**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AyarlarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSiteSettings();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Site Ayarları</h1>
      <SettingsForm
        settings={
          settings
            ? {
                whatsappNumber: settings.whatsappNumber,
                heroTitle: settings.heroTitle as Record<string, string> | null,
                heroSubtitle: settings.heroSubtitle as Record<string, string> | null,
                whatsappMessage: settings.whatsappMessage as Record<string, string> | null,
              }
            : null
        }
      />
    </div>
  );
}
```

- [ ] **Adım 4: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme; `/[locale]/admin/ayarlar` rotası üretilir.

- [ ] **Adım 5: Commit**

```bash
git add app/[locale]/admin/ayarlar components/admin/SettingsForm.tsx
git commit -m "feat: SiteSettings düzenleme formu + server action"
```

---

## Görev 11: Public Site SiteSettings'i Okusun

**Files:**
- Modify: `components/ui/WhatsAppButton.tsx`
- Modify: `app/[locale]/layout.tsx`
- Modify: `app/[locale]/page.tsx`

**Hedef:** Hardcoded env yerine WhatsApp numarası/mesajı ve hero başlığı DB'deki SiteSettings'ten gelsin (fallback: mevcut i18n mesajları).

- [ ] **Adım 1: WhatsAppButton'ı prop alır hale getir**

Replace `components/ui/WhatsAppButton.tsx`:

```tsx
import { localize, type Locale } from "@/lib/i18n-field";
import { getSiteSettings } from "@/lib/settings";
import { getLocale, getTranslations } from "next-intl/server";

export async function WhatsAppButton() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("whatsapp");
  const settings = await getSiteSettings();

  const number = settings?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const message =
    localize(settings?.whatsappMessage as Record<Locale, string> | null, locale) || t("message");
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("label")}
      className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-110"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207z" />
      </svg>
    </a>
  );
}
```

**Not:** WhatsAppButton artık async server component. `app/[locale]/layout.tsx` içinde `<WhatsAppButton />` kullanımı `await` gerektirmez (RSC await'i otomatik çözer) ama JSX'te `{await WhatsAppButton()}` değil `<WhatsAppButton />` olarak kalır — Next.js async server component'leri destekler. Ayrıca eski birim testi (`tests/unit/WhatsAppButton.test.tsx`) artık async server component'i test edemez; testi güncelle: ya kaldır ya da `localize` mantığını ayrı saf fonksiyona taşıyıp onu test et. Uygulayıcı: WhatsApp href üretim mantığını `lib`'de saf bir `buildWhatsAppHref(number, message)` fonksiyonuna çıkar ve onu test et; bileşeni bu fonksiyonu çağıracak şekilde sadeleştir.

- [ ] **Adım 2: buildWhatsAppHref saf fonksiyonu + test**

Create `lib/whatsapp.ts`:

```typescript
export function buildWhatsAppHref(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
```

Replace `tests/unit/WhatsAppButton.test.tsx` with `tests/unit/whatsapp.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildWhatsAppHref } from "@/lib/whatsapp";

describe("buildWhatsAppHref", () => {
  it("numara ve mesajdan wa.me linki üretir", () => {
    expect(buildWhatsAppHref("905555555555", "Merhaba")).toBe(
      "https://wa.me/905555555555?text=Merhaba"
    );
  });

  it("mesajı URL-encode eder", () => {
    expect(buildWhatsAppHref("905", "a b")).toContain("text=a%20b");
  });
});
```

Delete old test:

```bash
rm -f tests/unit/WhatsAppButton.test.tsx
```

Update `WhatsAppButton.tsx` to use `buildWhatsAppHref`:

```tsx
import { buildWhatsAppHref } from "@/lib/whatsapp";
// ... href = buildWhatsAppHref(number, message);
```

- [ ] **Adım 3: hero başlığını SiteSettings'ten oku (fallback i18n)**

Replace `app/[locale]/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { localize, type Locale } from "@/lib/i18n-field";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const settings = await getSiteSettings();

  const title =
    localize(settings?.heroTitle as Record<Locale, string> | null, locale as Locale) ||
    t("title");

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="font-serif text-4xl md:text-6xl text-cream max-w-3xl">{title}</h1>
      <div className="flex gap-4">
        <Link href="#" className="rounded bg-gold px-6 py-3 font-medium text-forest">
          {t("discover")}
        </Link>
        <Link href="#" className="rounded border border-copper px-6 py-3 font-medium text-cream">
          {t("franchise")}
        </Link>
      </div>
    </section>
  );
}
```

**Not:** SiteSettings DB okuması olan sayfalar artık tam statik (SSG) olamayabilir; ISR veya dinamik render'a düşebilir. Bu kabul edilebilir — admin değişikliği anında yansır. Performans için `revalidate` veya `unstable_cache` Faz 5'te değerlendirilecek. Build çıktısında bu rotaların dinamik (ƒ) olması beklenir.

- [ ] **Adım 4: Testleri ve build'i çalıştır**

Run: `npm test`
Expected: Tüm testler PASS (i18n-field, settings, whatsapp, routing, LanguageSwitcher, smoke).

Run: `npm run build`
Expected: Başarılı derleme.

- [ ] **Adım 5: Commit**

```bash
git add components/ui/WhatsAppButton.tsx lib/whatsapp.ts app/[locale]/page.tsx tests/unit/whatsapp.test.ts
git rm --cached tests/unit/WhatsAppButton.test.tsx 2>/dev/null || true
git commit -m "feat: public site SiteSettings'ten WhatsApp + hero okur"
```

---

## Faz 2 Tamamlanma Kriterleri
- [ ] `npx prisma migrate dev` ile tüm tablolar oluşur; `prisma db seed` SiteSettings singleton + Instagram linkini yazar.
- [ ] `npm test` tüm birim testler geçer.
- [ ] `npm run build` başarılı.
- [ ] `/admin/login` çalışır; doğru kimlik bilgileriyle giriş `/admin` dashboard'a yönlendirir; yanlış bilgi hata gösterir.
- [ ] Giriş yapılmadan `/admin` veya `/admin/ayarlar`'a gidince `/admin/login`'e yönlendirilir.
- [ ] Admin "Site Ayarları"nda WhatsApp no + hero başlığı (3 dilde) düzenlenip kaydedilebilir.
- [ ] Public ana sayfa hero başlığını ve yüzen WhatsApp butonu numarasını/mesajını DB'den okur (fallback i18n).

## Manuel Doğrulama Senaryosu (insan, gerçek DB ile)
1. `.env` doldur (DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH).
2. `npx prisma migrate dev` → `npx prisma db seed`.
3. `npm run dev`, `/admin/login`'e git, giriş yap.
4. Site Ayarları'nda hero başlığını değiştir, kaydet.
5. Ana sayfada değişikliğin yansıdığını gör.

## Sonraki Faz
**Faz 3:** Public sayfalar (Ana sayfa modülleri, Malzemelerimiz interaktif harita, Lezzetlerimiz katalog, Bayilik, İletişim) + premium animasyonlar. Ayrı plan dosyası.
```
