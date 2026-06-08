# Kunefe House — Faz 1: Temel, i18n & Marka Kimliği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Çalışan, çok dilli (TR/EN/AR + RTL), markalı bir Next.js iskeleti kurmak; header, footer ve yüzen WhatsApp butonu ile her sayfada gözüken kabuk.

**Architecture:** Next.js App Router + TypeScript. Tailwind CSS marka tokenları (orman yeşili/altın/bakır) CSS değişkenleriyle. `next-intl` ile TR/EN/AR yönlendirme ve RTL. Test: Vitest + Testing Library (birim), Playwright (RTL/e2e duman testi). Prisma + PostgreSQL bağlantısı kurulur ama modeller Faz 2'de.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, next-intl, Prisma, PostgreSQL, Vitest, @testing-library/react, Playwright, Framer Motion (kurulum).

**Spec:** `docs/superpowers/specs/2026-06-08-kunefe-house-design.md` (ogrenciler-net-modular deposundan kopyalanacak — Görev 0).

---

## Dosya Yapısı (Faz 1 sonunda)

```
kunefe-house/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx          # locale-aware root layout, dir=rtl/ltr
│   │   └── page.tsx            # geçici ana sayfa (placeholder hero)
│   ├── layout.tsx             # html kabuğu (next-intl provider köprüsü)
│   └── globals.css            # Tailwind + marka CSS değişkenleri
├── components/
│   ├── layout/
│   │   ├── Header.tsx         # logo + nav + dil seçici, scroll'da küçülür
│   │   ├── Footer.tsx         # sosyal + iletişim
│   │   └── LanguageSwitcher.tsx
│   └── ui/
│       └── WhatsAppButton.tsx # yüzen buton
├── i18n/
│   ├── routing.ts            # locale tanımları (tr/en/ar), defaultLocale=tr
│   ├── request.ts            # next-intl getRequestConfig
│   └── messages/
│       ├── tr.json
│       ├── en.json
│       └── ar.json
├── lib/
│   └── prisma.ts             # PrismaClient singleton
├── prisma/
│   └── schema.prisma         # sadece datasource+generator (modeller Faz 2)
├── tests/
│   ├── unit/
│   │   ├── WhatsAppButton.test.tsx
│   │   └── LanguageSwitcher.test.tsx
│   └── e2e/
│       └── locale-rtl.spec.ts
├── middleware.ts             # next-intl locale yönlendirme
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .gitignore
└── package.json
```

---

## Görev 0: Proje İskeleti & Git

**Files:**
- Create: tüm proje (create-next-app)
- Create: `.gitignore`, `.env.example`

- [ ] **Adım 1: Next.js projesi oluştur**

```bash
cd ~/Downloads
npx create-next-app@latest kunefe-house \
  --typescript --tailwind --app --eslint \
  --src-dir=false --import-alias "@/*" --no-turbopack
cd kunefe-house
```

- [ ] **Adım 2: Spec dokümanını kopyala**

```bash
mkdir -p docs/superpowers/specs
cp ~/Downloads/ogrenciler-net-modular/docs/superpowers/specs/2026-06-08-kunefe-house-design.md docs/superpowers/specs/
```

- [ ] **Adım 3: Bağımlılıkları kur**

```bash
npm install next-intl framer-motion @prisma/client
npm install -D prisma vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

- [ ] **Adım 4: .env.example oluştur**

```
DATABASE_URL="postgresql://user:password@localhost:5432/kunefe_house?schema=public"
NEXT_PUBLIC_WHATSAPP_NUMBER="905555555555"
```

- [ ] **Adım 5: İlk commit**

```bash
git add -A
git commit -m "chore: Next.js iskelet + bağımlılıklar"
```

---

## Görev 1: Test Altyapısı (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (scripts)

- [ ] **Adım 1: vitest.config.ts oluştur**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Adım 2: tests/setup.ts oluştur**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Adım 3: package.json scriptlerini ekle**

`package.json` içindeki `"scripts"` bloğuna ekle:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Adım 4: Geçici doğrulama testi yaz**

Create `tests/unit/smoke.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("test altyapısı çalışıyor", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Adım 5: Çalıştır ve geçtiğini gör**

Run: `npm test`
Expected: PASS (1 test)

- [ ] **Adım 6: Commit**

```bash
git add vitest.config.ts tests/ package.json
git commit -m "test: Vitest + Testing Library altyapısı"
```

---

## Görev 2: i18n Yönlendirme (TR/EN/AR + RTL)

**Files:**
- Create: `i18n/routing.ts`, `i18n/request.ts`
- Create: `i18n/messages/tr.json`, `en.json`, `ar.json`
- Create: `middleware.ts`
- Modify: `next.config.ts` (next-intl plugin)

- [ ] **Adım 1: i18n/routing.ts oluştur**

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en", "ar"],
  defaultLocale: "tr",
  localePrefix: "as-needed",
});

export const rtlLocales = ["ar"];
export function getDir(locale: string): "rtl" | "ltr" {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}
```

- [ ] **Adım 2: i18n/request.ts oluştur**

```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

- [ ] **Adım 3: Mesaj dosyalarını oluştur**

Create `i18n/messages/tr.json`:

```json
{
  "nav": { "home": "Ana Sayfa", "ingredients": "Malzemelerimiz", "menu": "Lezzetlerimiz", "franchise": "Bayilik", "contact": "İletişim" },
  "hero": { "title": "Gelenekten Geleceğe Uzanan Lezzet", "discover": "Lezzetleri Keşfet", "franchise": "Bayi Ol" },
  "whatsapp": { "label": "WhatsApp", "message": "Merhaba, bilgi almak istiyorum." },
  "footer": { "rights": "Tüm hakları saklıdır." }
}
```

Create `i18n/messages/en.json`:

```json
{
  "nav": { "home": "Home", "ingredients": "Our Ingredients", "menu": "Our Flavors", "franchise": "Franchise", "contact": "Contact" },
  "hero": { "title": "A Taste Bridging Tradition and Future", "discover": "Discover Flavors", "franchise": "Become a Franchisee" },
  "whatsapp": { "label": "WhatsApp", "message": "Hello, I would like to get information." },
  "footer": { "rights": "All rights reserved." }
}
```

Create `i18n/messages/ar.json`:

```json
{
  "nav": { "home": "الرئيسية", "ingredients": "مكوناتنا", "menu": "نكهاتنا", "franchise": "حقوق الامتياز", "contact": "اتصل بنا" },
  "hero": { "title": "نكهة تمتد من التقاليد إلى المستقبل", "discover": "اكتشف النكهات", "franchise": "كن صاحب امتياز" },
  "whatsapp": { "label": "واتساب", "message": "مرحباً، أود الحصول على معلومات." },
  "footer": { "rights": "جميع الحقوق محفوظة." }
}
```

- [ ] **Adım 4: middleware.ts oluştur**

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Adım 5: next.config.ts'i next-intl plugin ile sar**

`next.config.ts` içeriğini değiştir:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
};

export default withNextIntl(nextConfig);
```

- [ ] **Adım 6: getDir için birim testi yaz**

Create `tests/unit/routing.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getDir } from "@/i18n/routing";

describe("getDir", () => {
  it("Arapça için rtl döner", () => {
    expect(getDir("ar")).toBe("rtl");
  });
  it("Türkçe için ltr döner", () => {
    expect(getDir("tr")).toBe("ltr");
  });
  it("İngilizce için ltr döner", () => {
    expect(getDir("en")).toBe("ltr");
  });
});
```

- [ ] **Adım 7: Çalıştır ve geçtiğini gör**

Run: `npm test`
Expected: PASS (getDir 3 test + smoke)

- [ ] **Adım 8: Commit**

```bash
git add i18n/ middleware.ts next.config.ts tests/unit/routing.test.ts
git commit -m "feat: i18n yönlendirme TR/EN/AR + RTL yardımcısı"
```

---

## Görev 3: Marka Tokenları (Tailwind + CSS değişkenleri)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Adım 1: tailwind.config.ts marka renklerini ekle**

`tailwind.config.ts` içeriğini değiştir:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#1B3B2F", light: "#2D5A43" },
        gold: "#C9A227",
        copper: "#B87333",
        cream: "#F5F0E6",
        pistachio: "#7BA05B",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Adım 2: globals.css'e CSS değişkenleri + RTL temel kuralları ekle**

`app/globals.css` başına ekle (Tailwind direktiflerinden sonra):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-forest: #1B3B2F;
  --color-gold: #C9A227;
  --color-copper: #B87333;
  --color-cream: #F5F0E6;
  --color-pistachio: #7BA05B;
}

body {
  background-color: var(--color-forest);
  color: var(--color-cream);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Adım 3: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme (hata yok). Not: locale sayfaları henüz yoksa Görev 4'ten sonra tekrar denenecek; bu adımda sadece CSS/config derlemesi kontrol edilir.

- [ ] **Adım 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: marka renk tokenları + reduced-motion"
```

---

## Görev 4: Locale-Aware Root Layout

**Files:**
- Create/Modify: `app/layout.tsx`
- Create: `app/[locale]/layout.tsx`
- Create: `app/[locale]/page.tsx`
- Delete: `app/page.tsx` (varsa eski default)

- [ ] **Adım 1: Eski default ana sayfayı sil**

```bash
rm -f app/page.tsx
```

- [ ] **Adım 2: app/layout.tsx'i minimal kabuk yap**

`app/layout.tsx` içeriğini değiştir:

```tsx
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```

- [ ] **Adım 3: app/[locale]/layout.tsx oluştur**

```tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, getDir } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} dir={getDir(locale)}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Adım 4: app/[locale]/page.tsx geçici hero oluştur**

```tsx
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations("hero");
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="font-serif text-4xl md:text-6xl text-cream max-w-3xl">
        {t("title")}
      </h1>
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

- [ ] **Adım 5: Commit (Header/Footer/WhatsApp Görev 5-6'da; geçici stub'lar gerekecek)**

> Not: Bu görev derlenmez çünkü Header/Footer/WhatsAppButton henüz yok. Görev 5 ve 6 tamamlandıktan sonra build alınır. Şimdilik commit etme; Görev 6 sonunda topluca build + commit yapılacak.

---

## Görev 5: Header, Footer, Dil Seçici

**Files:**
- Create: `components/layout/Header.tsx`
- Create: `components/layout/Footer.tsx`
- Create: `components/layout/LanguageSwitcher.tsx`
- Test: `tests/unit/LanguageSwitcher.test.tsx`

- [ ] **Adım 1: LanguageSwitcher için failing test yaz**

Create `tests/unit/LanguageSwitcher.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next-intl", () => ({ useLocale: () => "tr" }));

describe("LanguageSwitcher", () => {
  it("üç dil seçeneği gösterir", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("TR")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
  });
});
```

- [ ] **Adım 2: Çalıştır, başarısız olduğunu gör**

Run: `npm test -- LanguageSwitcher`
Expected: FAIL ("Cannot find module .../LanguageSwitcher")

- [ ] **Adım 3: LanguageSwitcher.tsx oluştur**

```tsx
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const LOCALES = ["tr", "en", "ar"] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: string) {
    const segments = pathname.split("/");
    if (LOCALES.includes(segments[1] as any)) {
      segments[1] = target;
    } else {
      segments.splice(1, 0, target);
    }
    router.replace(segments.join("/") || "/");
  }

  return (
    <div className="flex gap-2 text-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={l === locale ? "font-bold text-gold" : "text-cream"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Adım 4: Çalıştır, geçtiğini gör**

Run: `npm test -- LanguageSwitcher`
Expected: PASS

- [ ] **Adım 5: Header.tsx oluştur**

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between px-6 transition-all bg-forest/95 backdrop-blur ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <Link href="/" className="font-serif text-xl text-cream">
        KUNEFE <span className="text-gold">HOUSE</span>
      </Link>
      <nav className="hidden gap-6 text-sm text-cream md:flex">
        <Link href="/">{t("home")}</Link>
        <Link href="/malzemelerimiz">{t("ingredients")}</Link>
        <Link href="/lezzetlerimiz">{t("menu")}</Link>
        <Link href="/bayilik">{t("franchise")}</Link>
        <Link href="/iletisim">{t("contact")}</Link>
      </nav>
      <LanguageSwitcher />
    </header>
  );
}
```

- [ ] **Adım 6: Footer.tsx oluştur**

```tsx
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-20 border-t border-copper/30 px-6 py-10 text-center text-sm text-cream/70">
      <p>© {new Date().getFullYear()} Kunefe House. {t("rights")}</p>
    </footer>
  );
}
```

- [ ] **Adım 7: Commit**

```bash
git add components/layout/ tests/unit/LanguageSwitcher.test.tsx
git commit -m "feat: Header, Footer, dil seçici"
```

---

## Görev 6: Yüzen WhatsApp Butonu

**Files:**
- Create: `components/ui/WhatsAppButton.tsx`
- Test: `tests/unit/WhatsAppButton.test.tsx`

- [ ] **Adım 1: Failing test yaz**

Create `tests/unit/WhatsAppButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "message" ? "Merhaba" : "WhatsApp",
}));

describe("WhatsAppButton", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "905555555555";
  });

  it("doğru wa.me linkini oluşturur", () => {
    render(<WhatsAppButton />);
    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/905555555555")
    );
  });
});
```

- [ ] **Adım 2: Çalıştır, başarısız olduğunu gör**

Run: `npm test -- WhatsAppButton`
Expected: FAIL ("Cannot find module .../WhatsAppButton")

- [ ] **Adım 3: WhatsAppButton.tsx oluştur**

```tsx
"use client";

import { useTranslations } from "next-intl";

export function WhatsAppButton() {
  const t = useTranslations("whatsapp");
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const href = `https://wa.me/${number}?text=${encodeURIComponent(t("message"))}`;

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

- [ ] **Adım 4: Çalıştır, geçtiğini gör**

Run: `npm test -- WhatsAppButton`
Expected: PASS

- [ ] **Adım 5: Tüm projeyi derle (Görev 4 dahil ilk tam build)**

Run: `npm run build`
Expected: Başarılı derleme, `/tr`, `/en`, `/ar` rotaları üretilir.

- [ ] **Adım 6: Commit**

```bash
git add components/ui/WhatsAppButton.tsx tests/unit/WhatsAppButton.test.tsx
git commit -m "feat: yüzen WhatsApp butonu"
```

---

## Görev 7: Prisma + PostgreSQL Bağlantısı

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Adım 1: Prisma'yı başlat**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Adım 2: prisma/schema.prisma'yı sadeleştir (modeller Faz 2)**

`prisma/schema.prisma` içeriğini değiştir:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Modeller Faz 2'de eklenecek (Product, SiteSettings, FranchiseApplication, ...)
```

- [ ] **Adım 3: lib/prisma.ts singleton oluştur**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Adım 4: Prisma client üret (bağlantı gerektirmez)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" mesajı.

- [ ] **Adım 5: Commit**

```bash
git add prisma/ lib/prisma.ts .env.example
git commit -m "chore: Prisma + PostgreSQL bağlantısı (modeller Faz 2)"
```

---

## Görev 8: RTL Duman Testi (Playwright)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/locale-rtl.spec.ts`

- [ ] **Adım 1: playwright.config.ts oluştur**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run build && npm start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
});
```

- [ ] **Adım 2: Playwright tarayıcılarını kur**

```bash
npx playwright install chromium
```

- [ ] **Adım 3: RTL e2e testi yaz**

Create `tests/e2e/locale-rtl.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test("Arapça sayfa dir=rtl olur", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("Türkçe sayfa dir=ltr olur", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("WhatsApp butonu görünür", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.getByRole("link", { name: /whatsapp/i })).toBeVisible();
});
```

- [ ] **Adım 4: Çalıştır, geçtiğini gör**

Run: `npm run test:e2e`
Expected: PASS (3 test)

- [ ] **Adım 5: Commit**

```bash
git add playwright.config.ts tests/e2e/locale-rtl.spec.ts
git commit -m "test: RTL + WhatsApp duman testleri (Playwright)"
```

---

## Faz 1 Tamamlanma Kriterleri
- [ ] `npm test` tüm birim testler geçer.
- [ ] `npm run test:e2e` RTL/duman testleri geçer.
- [ ] `npm run build` başarılı; `/tr`, `/en`, `/ar` üretilir.
- [ ] Arapça'da `dir="rtl"`, diğerlerinde `ltr`.
- [ ] Header, Footer, yüzen WhatsApp her sayfada.
- [ ] Marka renkleri uygulanmış.
- [ ] Prisma client üretiliyor (modeller Faz 2'de).

## Sonraki Faz
**Faz 2:** Veri modeli (tüm koleksiyonlar), admin session auth, SiteSettings yönetimi. Ayrı plan dosyası: `2026-XX-XX-faz2-veri-modeli-admin.md`.
