# Kunefe House — Faz 3a: Görsel Yükleme, Logo & Ürünler (dikey dilim) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin'den görsel yüklenebilen (Supabase Storage) bir altyapı kurmak; logoyu admin'den yönetip header'a basmak; ürünleri (Lezzetlerimiz) admin'den ekle/düzenle/sil (görsel + 3 dilli alanlar) ve public katalog + ürün detay + ana sayfa "öne çıkanlar" slider'ında göstermek.

**Architecture:** Görseller Supabase Storage'da public "media" bucket'ında; yükleme server action ile `@supabase/supabase-js` service-role anahtarı kullanılarak yapılır, public URL DB'ye yazılır. Yeniden kullanılabilir `ImageUpload` admin bileşeni + `LocalizedInput` (Faz 2) ile formlar. Public sayfalar `next/image` (AVIF/WebP, lazy) ile görselleri gösterir; admin yazınca `revalidate` ile tazelenir. Ürün CRUD server action'larla, hepsi `requireAdmin()` korumalı.

**Tech Stack:** Next.js 16, Prisma 7 + Supabase Postgres, Supabase Storage, @supabase/supabase-js, next-intl 4.13, Framer Motion, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-08-kunefe-house-design.md`

**Önkoşul (insan, Görev 1'de istenecek):**
- Supabase → Storage → **"media" adında public bucket** oluştur.
- `.env`'e ekle: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API'den).

---

## Dosya Yapısı (Faz 3a sonunda eklenenler)

```
kunefe-house/
├── lib/
│   ├── storage.ts            # Supabase Storage upload/delete helper (service-role)
│   ├── slug.ts               # slugify() yardımcısı
│   └── products.ts           # getProducts/getProductBySlug/getFeaturedProducts/getCategories (cache)
├── app/
│   ├── api/admin/upload/route.ts   # görsel yükleme endpoint (auth korumalı)
│   ├── [locale]/
│   │   ├── admin/
│   │   │   ├── urunler/
│   │   │   │   ├── page.tsx          # ürün listesi
│   │   │   │   ├── actions.ts        # create/update/delete/toggleFeatured
│   │   │   │   ├── yeni/page.tsx      # yeni ürün formu
│   │   │   │   └── [id]/page.tsx      # ürün düzenleme formu
│   │   │   └── kategoriler/
│   │   │       ├── page.tsx
│   │   │       └── actions.ts
│   │   └── lezzetlerimiz/
│   │       ├── page.tsx              # public katalog (grid + kategori filtre)
│   │       └── [slug]/page.tsx       # ürün detay
├── components/
│   ├── admin/
│   │   ├── ImageUpload.tsx           # yeniden kullanılabilir görsel yükleyici
│   │   └── ProductForm.tsx           # ürün ekle/düzenle formu
│   └── public/
│       ├── ProductCard.tsx           # hover'da ikinci görsel
│       └── FeaturedSlider.tsx        # ana sayfa öne çıkanlar
├── tests/unit/
│   ├── slug.test.ts
│   └── storage.test.ts
└── next.config.ts            # images.remotePatterns += Supabase host
```

---

## Görev 1: Supabase Storage Helper + Env + next/image host

**Files:**
- Create: `lib/storage.ts`
- Modify: `next.config.ts`, `.env.example`
- Test: `tests/unit/storage.test.ts`

**Önkoşul (insan):** "media" public bucket oluşturulmalı; `.env`'e `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` eklenmeli. Yoksa BLOCKED bildir.

- [ ] **Adım 1: @supabase/supabase-js kur**

```bash
npm install @supabase/supabase-js
```

- [ ] **Adım 2: Failing test yaz (saf yardımcı: storage path üretimi)**

Create `tests/unit/storage.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildStoragePath, publicUrlFor } from "@/lib/storage";

describe("buildStoragePath", () => {
  it("klasör + benzersiz dosya adı üretir (uzantı korunur)", () => {
    const p = buildStoragePath("products", "Künefe Resmi.JPG");
    expect(p).toMatch(/^products\/[0-9a-f-]+\.jpg$/);
  });
  it("uzantı yoksa bin varsayar", () => {
    const p = buildStoragePath("logos", "logo");
    expect(p).toMatch(/^logos\/[0-9a-f-]+\.bin$/);
  });
});

describe("publicUrlFor", () => {
  it("bucket public URL'i kurar", () => {
    const url = publicUrlFor("https://abc.supabase.co", "media", "products/x.jpg");
    expect(url).toBe("https://abc.supabase.co/storage/v1/object/public/media/products/x.jpg");
  });
});
```

- [ ] **Adım 3: Test'in başarısız olduğunu gör**

Run: `npm test -- storage`
Expected: FAIL ("Cannot find module")

- [ ] **Adım 4: lib/storage.ts oluştur**

```typescript
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const MEDIA_BUCKET = "media";

export function buildStoragePath(folder: string, originalName: string): string {
  const dotIdx = originalName.lastIndexOf(".");
  const ext = dotIdx > 0 ? originalName.slice(dotIdx + 1).toLowerCase() : "bin";
  return `${folder}/${randomUUID()}.${ext}`;
}

export function publicUrlFor(supabaseUrl: string, bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage env eksik");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadImage(
  folder: string,
  file: { name: string; arrayBuffer: () => Promise<ArrayBuffer>; type: string }
): Promise<string> {
  const supabase = adminClient();
  const path = buildStoragePath(folder, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(`Yükleme hatası: ${error.message}`);
  return publicUrlFor(process.env.NEXT_PUBLIC_SUPABASE_URL!, MEDIA_BUCKET, path);
}

export async function deleteImageByUrl(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  const supabase = adminClient();
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
```

- [ ] **Adım 5: Test'in geçtiğini gör**

Run: `npm test -- storage`
Expected: PASS

- [ ] **Adım 6: next.config.ts'e Supabase host'u ekle**

`next.config.ts` içindeki `nextConfig.images`'i güncelle (mevcut `formats`'ı koru):

```typescript
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};
```

- [ ] **Adım 7: .env.example'a Storage değişkenlerini ekle**

`.env.example` sonuna ekle:

```
NEXT_PUBLIC_SUPABASE_URL="https://<proje-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="Supabase → Project Settings → API → service_role key"
```

- [ ] **Adım 8: Commit**

```bash
git add lib/storage.ts tests/unit/storage.test.ts next.config.ts .env.example package.json package-lock.json
git commit -m "feat: Supabase Storage görsel yükleme helper + next/image host"
```

---

## Görev 2: Görsel Yükleme API + ImageUpload Bileşeni

**Files:**
- Create: `app/api/admin/upload/route.ts`
- Create: `components/admin/ImageUpload.tsx`

- [ ] **Adım 1: Upload API route oluştur (auth korumalı)**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = (formData.get("folder") as string) || "misc";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Sadece görsel yüklenebilir" }, { status: 400 });
  }
  try {
    const url = await uploadImage(folder, file);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Adım 2: ImageUpload.tsx oluştur**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";

export function ImageUpload({
  name,
  label,
  folder,
  defaultUrl,
}: {
  name: string;
  label: string;
  folder: string;
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Yükleme başarısız");
      return;
    }
    const { url } = await res.json();
    setUrl(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-cream/80">{label}</label>
      {url && (
        <Image src={url} alt="" width={120} height={120}
          className="h-28 w-28 rounded object-cover" />
      )}
      <input type="hidden" name={name} value={url} />
      <input type="file" accept="image/*" onChange={onChange}
        className="text-sm text-cream/70 file:mr-3 file:rounded file:border-0 file:bg-gold file:px-3 file:py-1 file:text-forest" />
      {loading && <p className="text-xs text-cream/60">Yükleniyor…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Adım 3: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme.

- [ ] **Adım 4: Commit**

```bash
git add app/api/admin/upload/route.ts components/admin/ImageUpload.tsx
git commit -m "feat: görsel yükleme API + ImageUpload admin bileşeni"
```

---

## Görev 3: Logo Yönetimi (SiteSettings) + Header'da Göster

**Files:**
- Modify: `app/[locale]/admin/ayarlar/actions.ts`
- Modify: `components/admin/SettingsForm.tsx`
- Modify: `app/[locale]/admin/ayarlar/page.tsx`
- Modify: `components/layout/Header.tsx`
- Create: `lib/settings.ts` zaten var — kullanılacak

- [ ] **Adım 1: updateSettings'e logo alanlarını ekle**

`app/[locale]/admin/ayarlar/actions.ts` içinde `updateSettings` gövdesini güncelle (mevcut alanları koru, logo ekle):

```typescript
export async function updateSettings(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
  const whatsappNumber = (formData.get("whatsappNumber") as string) ?? "";
  const logoHeaderUrl = (formData.get("logoHeaderUrl") as string) || null;
  const logoFooterUrl = (formData.get("logoFooterUrl") as string) || null;
  const heroTitle = readLocalized(formData, "heroTitle");
  const heroSubtitle = readLocalized(formData, "heroSubtitle");
  const whatsappMessage = readLocalized(formData, "whatsappMessage");
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { whatsappNumber, logoHeaderUrl, logoFooterUrl, heroTitle, heroSubtitle, whatsappMessage },
    create: { id: 1, whatsappNumber, logoHeaderUrl, logoFooterUrl, heroTitle, heroSubtitle, whatsappMessage },
  });
}
```

- [ ] **Adım 2: SettingsForm'a logo yükleyiciler ekle**

`components/admin/SettingsForm.tsx`: `Settings` tipine `logoHeaderUrl`/`logoFooterUrl` ekle ve formda `ImageUpload` kullan.

```tsx
import { LocalizedInput } from "./LocalizedInput";
import { ImageUpload } from "./ImageUpload";
import { updateSettings } from "@/app/[locale]/admin/ayarlar/actions";

type Settings = {
  whatsappNumber: string | null;
  logoHeaderUrl: string | null;
  logoFooterUrl: string | null;
  heroTitle: Record<string, string> | null;
  heroSubtitle: Record<string, string> | null;
  whatsappMessage: Record<string, string> | null;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  return (
    <form action={updateSettings} className="flex max-w-xl flex-col gap-6">
      <ImageUpload name="logoHeaderUrl" label="Logo (Header)" folder="logos" defaultUrl={settings?.logoHeaderUrl} />
      <ImageUpload name="logoFooterUrl" label="Logo (Footer)" folder="logos" defaultUrl={settings?.logoFooterUrl} />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">WhatsApp Numarası</label>
        <input name="whatsappNumber" defaultValue={settings?.whatsappNumber ?? ""} placeholder="905555555555"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <LocalizedInput name="whatsappMessage" label="WhatsApp Hazır Mesaj" defaultValue={settings?.whatsappMessage} multiline />
      <LocalizedInput name="heroTitle" label="Hero Başlık" defaultValue={settings?.heroTitle} />
      <LocalizedInput name="heroSubtitle" label="Hero Alt Başlık" defaultValue={settings?.heroSubtitle} />
      <button type="submit" className="self-start rounded bg-gold px-6 py-2 font-medium text-forest">Kaydet</button>
    </form>
  );
}
```

- [ ] **Adım 3: ayarlar/page.tsx'te logo alanlarını forma geçir**

`app/[locale]/admin/ayarlar/page.tsx` içindeki `SettingsForm settings={...}` nesnesine ekle:

```tsx
      <SettingsForm settings={settings ? {
        whatsappNumber: settings.whatsappNumber,
        logoHeaderUrl: settings.logoHeaderUrl,
        logoFooterUrl: settings.logoFooterUrl,
        heroTitle: settings.heroTitle as Record<string, string> | null,
        heroSubtitle: settings.heroSubtitle as Record<string, string> | null,
        whatsappMessage: settings.whatsappMessage as Record<string, string> | null,
      } : null} />
```

- [ ] **Adım 4: Header logoyu SiteSettings'ten okusun (fallback: metin wordmark)**

`components/layout/Header.tsx` şu an `"use client"` ve scroll mantığı içeriyor. Logo'yu server'dan props ile geçirmek için Header'ı ikiye ayır: server wrapper logoyu okur, client kısım scroll yapar.

Replace `components/layout/Header.tsx`:

```tsx
import { getSiteSettings } from "@/lib/settings";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const settings = await getSiteSettings();
  return <HeaderClient logoUrl={settings?.logoHeaderUrl ?? null} />;
}
```

Create `components/layout/HeaderClient.tsx`:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function HeaderClient({ logoUrl }: { logoUrl: string | null }) {
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
      <Link href="/" className="flex items-center">
        {logoUrl ? (
          <Image src={logoUrl} alt="Kunefe House" width={140} height={48}
            className={`w-auto transition-all ${scrolled ? "h-8" : "h-11"}`} priority />
        ) : (
          <span className="font-serif text-xl text-cream">
            KUNEFE <span className="text-gold">HOUSE</span>
          </span>
        )}
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

- [ ] **Adım 5: Build + test**

Run: `npm run build` → success.
Run: `npm test` → all pass.

- [ ] **Adım 6: Commit**

```bash
git add app/[locale]/admin/ayarlar components/admin/SettingsForm.tsx components/layout/Header.tsx components/layout/HeaderClient.tsx
git commit -m "feat: logo yönetimi (SiteSettings) + header'da göster"
```

---

## Görev 4: Slug Yardımcısı + Ürün Veri Erişimi

**Files:**
- Create: `lib/slug.ts`, `lib/products.ts`
- Test: `tests/unit/slug.test.ts`

- [ ] **Adım 1: slug için failing test yaz**

Create `tests/unit/slug.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("Türkçe karakterleri sadeleştirir", () => {
    expect(slugify("Fıstıklı Künefe")).toBe("fistikli-kunefe");
  });
  it("boşluk ve sembolleri tireye çevirir", () => {
    expect(slugify("Çikolatalı  Künefe!")).toBe("cikolatali-kunefe");
  });
  it("baş/son tireleri kırpar", () => {
    expect(slugify("  Spesiyal  ")).toBe("spesiyal");
  });
});
```

- [ ] **Adım 2: Test'in başarısız olduğunu gör**

Run: `npm test -- slug`
Expected: FAIL

- [ ] **Adım 3: lib/slug.ts oluştur**

```typescript
const TR_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
};

export function slugify(input: string): string {
  return input
    .trim()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Adım 4: Test'in geçtiğini gör**

Run: `npm test -- slug`
Expected: PASS

- [ ] **Adım 5: lib/products.ts oluştur**

```typescript
import { cache } from "react";
import { prisma } from "./prisma";

export const getProducts = cache(async () => {
  return prisma.product.findMany({
    orderBy: { order: "asc" },
    include: { category: true },
  });
});

export const getFeaturedProducts = cache(async () => {
  return prisma.product.findMany({
    where: { featured: true },
    orderBy: { order: "asc" },
    take: 5,
  });
});

export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findUnique({ where: { slug }, include: { category: true } });
});

export const getCategories = cache(async () => {
  return prisma.productCategory.findMany({ orderBy: { order: "asc" } });
});
```

- [ ] **Adım 6: Commit**

```bash
git add lib/slug.ts lib/products.ts tests/unit/slug.test.ts
git commit -m "feat: slugify yardımcısı + ürün veri erişimi"
```

---

## Görev 5: Kategori Yönetimi (Admin)

**Files:**
- Create: `app/[locale]/admin/kategoriler/page.tsx`, `actions.ts`

- [ ] **Adım 1: Kategori server action'ları oluştur**

Create `app/[locale]/admin/kategoriler/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

export async function createCategory(formData: FormData) {
  await guard();
  const tr = (formData.get("name.tr") as string) ?? "";
  const en = (formData.get("name.en") as string) ?? "";
  const ar = (formData.get("name.ar") as string) ?? "";
  if (!tr.trim()) throw new Error("Türkçe ad zorunlu");
  await prisma.productCategory.create({
    data: { name: { tr, en, ar }, slug: slugify(tr) },
  });
  revalidatePath("/admin/kategoriler");
}

export async function deleteCategory(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.productCategory.delete({ where: { id } });
  revalidatePath("/admin/kategoriler");
}
```

- [ ] **Adım 2: Kategori sayfası oluştur**

Create `app/[locale]/admin/kategoriler/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { createCategory, deleteCategory } from "./actions";

export default async function KategorilerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Kategoriler</h1>
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded bg-forest-light px-4 py-2">
            <span>{(c.name as Record<string, string>)?.tr ?? c.slug}</span>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {categories.length === 0 && <p className="text-cream/60">Henüz kategori yok.</p>}
      </ul>
      <form action={createCategory} className="flex max-w-md flex-col gap-4 rounded bg-forest-light p-4">
        <h2 className="font-serif text-gold">Yeni Kategori</h2>
        <LocalizedInput name="name" label="Ad" />
        <button className="self-start rounded bg-gold px-4 py-2 text-forest">Ekle</button>
      </form>
    </div>
  );
}
```

- [ ] **Adım 3: Admin menüsüne kategoriler + ürünler linki ekle**

`app/[locale]/admin/layout.tsx` içindeki `<aside>` nav'ına ekle:

```tsx
      <aside className="flex gap-6 border-b border-copper/30 px-6 py-4">
        <Link href="/admin" className="font-serif text-gold">Panel</Link>
        <Link href="/admin/ayarlar">Site Ayarları</Link>
        <Link href="/admin/kategoriler">Kategoriler</Link>
        <Link href="/admin/urunler">Ürünler</Link>
      </aside>
```

- [ ] **Adım 4: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme.

- [ ] **Adım 5: Commit**

```bash
git add app/[locale]/admin/kategoriler app/[locale]/admin/layout.tsx
git commit -m "feat: kategori yönetimi (admin) + menü linkleri"
```

---

## Görev 6: Ürün Server Action'ları (create/update/delete/featured)

**Files:**
- Create: `app/[locale]/admin/urunler/actions.ts`

- [ ] **Adım 1: Ürün action'ları oluştur**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { deleteImageByUrl } from "@/lib/storage";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

function parseIngredients(raw: string) {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

export async function createProduct(formData: FormData) {
  await guard();
  const title = readLocalized(formData, "title");
  if (!title.tr.trim()) throw new Error("Türkçe başlık zorunlu");
  await prisma.product.create({
    data: {
      title,
      slug: slugify(title.tr),
      shortDescription: readLocalized(formData, "shortDescription"),
      ingredients: parseIngredients((formData.get("ingredients") as string) ?? ""),
      primaryImageUrl: (formData.get("primaryImageUrl") as string) || null,
      secondaryImageUrl: (formData.get("secondaryImageUrl") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      featured: formData.get("featured") === "on",
    },
  });
  revalidatePath("/admin/urunler");
  redirect("/admin/urunler");
}

export async function updateProduct(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const title = readLocalized(formData, "title");
  await prisma.product.update({
    where: { id },
    data: {
      title,
      shortDescription: readLocalized(formData, "shortDescription"),
      ingredients: parseIngredients((formData.get("ingredients") as string) ?? ""),
      primaryImageUrl: (formData.get("primaryImageUrl") as string) || null,
      secondaryImageUrl: (formData.get("secondaryImageUrl") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      featured: formData.get("featured") === "on",
    },
  });
  revalidatePath("/admin/urunler");
  redirect("/admin/urunler");
}

export async function deleteProduct(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const product = await prisma.product.findUnique({ where: { id } });
  if (product?.primaryImageUrl) await deleteImageByUrl(product.primaryImageUrl);
  if (product?.secondaryImageUrl) await deleteImageByUrl(product.secondaryImageUrl);
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/urunler");
}
```

- [ ] **Adım 2: tsc ile doğrula**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Adım 3: Commit**

```bash
git add app/[locale]/admin/urunler/actions.ts
git commit -m "feat: ürün create/update/delete server action'ları"
```

---

## Görev 7: Ürün Formu Bileşeni + Yeni/Düzenle Sayfaları

**Files:**
- Create: `components/admin/ProductForm.tsx`
- Create: `app/[locale]/admin/urunler/yeni/page.tsx`, `app/[locale]/admin/urunler/[id]/page.tsx`

- [ ] **Adım 1: ProductForm.tsx oluştur**

```tsx
import { LocalizedInput } from "./LocalizedInput";
import { ImageUpload } from "./ImageUpload";

type Category = { id: string; name: Record<string, string> | unknown };
type ProductData = {
  id?: string;
  title?: Record<string, string> | null;
  shortDescription?: Record<string, string> | null;
  ingredients?: string[] | null;
  primaryImageUrl?: string | null;
  secondaryImageUrl?: string | null;
  categoryId?: string | null;
  featured?: boolean;
};

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: (formData: FormData) => void;
  categories: Category[];
  product?: ProductData;
}) {
  const ingredientsText = (product?.ingredients ?? []).join("\n");
  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <LocalizedInput name="title" label="Başlık" defaultValue={product?.title} />
      <LocalizedInput name="shortDescription" label="Kısa Açıklama" defaultValue={product?.shortDescription} multiline />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Malzemeler (her satıra bir tane)</label>
        <textarea name="ingredients" defaultValue={ingredientsText} rows={4}
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <ImageUpload name="primaryImageUrl" label="Ana Görsel" folder="products" defaultUrl={product?.primaryImageUrl} />
      <ImageUpload name="secondaryImageUrl" label="Hover Görseli" folder="products" defaultUrl={product?.secondaryImageUrl} />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Kategori</label>
        <select name="categoryId" defaultValue={product?.categoryId ?? ""}
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="">— Yok —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {(c.name as Record<string, string>)?.tr ?? c.id}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-cream/80">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} />
        Ana sayfada öne çıkar
      </label>
      <button type="submit" className="self-start rounded bg-gold px-6 py-2 font-medium text-forest">Kaydet</button>
    </form>
  );
}
```

- [ ] **Adım 2: Yeni ürün sayfası oluştur**

Create `app/[locale]/admin/urunler/yeni/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export default async function YeniUrunPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Yeni Ürün</h1>
      <ProductForm action={createProduct} categories={categories} />
    </div>
  );
}
```

- [ ] **Adım 3: Düzenleme sayfası oluştur**

Create `app/[locale]/admin/urunler/[id]/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "../actions";

export default async function UrunDuzenlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAdmin();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getCategories(),
  ]);
  if (!product) notFound();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Ürün Düzenle</h1>
      <ProductForm
        action={updateProduct}
        categories={categories}
        product={{
          id: product.id,
          title: product.title as Record<string, string> | null,
          shortDescription: product.shortDescription as Record<string, string> | null,
          ingredients: (product.ingredients as string[] | null) ?? [],
          primaryImageUrl: product.primaryImageUrl,
          secondaryImageUrl: product.secondaryImageUrl,
          categoryId: product.categoryId,
          featured: product.featured,
        }}
      />
    </div>
  );
}
```

- [ ] **Adım 4: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme.

- [ ] **Adım 5: Commit**

```bash
git add components/admin/ProductForm.tsx app/[locale]/admin/urunler/yeni app/[locale]/admin/urunler/[id]
git commit -m "feat: ürün formu + yeni/düzenle sayfaları"
```

---

## Görev 8: Ürün Liste Sayfası (Admin)

**Files:**
- Create: `app/[locale]/admin/urunler/page.tsx`

- [ ] **Adım 1: Ürün liste sayfası oluştur**

```tsx
import Link from "next/link";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getProducts } from "@/lib/products";
import { deleteProduct } from "./actions";

export default async function UrunlerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const products = await getProducts();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-gold">Ürünler</h1>
        <Link href="/admin/urunler/yeni" className="rounded bg-gold px-4 py-2 text-sm font-medium text-forest">
          + Yeni Ürün
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-4 rounded bg-forest-light px-4 py-2">
            {p.primaryImageUrl ? (
              <Image src={p.primaryImageUrl} alt="" width={48} height={48} className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-forest" />
            )}
            <span className="flex-1">{(p.title as Record<string, string>)?.tr ?? p.slug}</span>
            {p.featured && <span className="text-xs text-gold">★ öne çıkan</span>}
            <Link href={`/admin/urunler/${p.id}`} className="text-sm text-cream/80">Düzenle</Link>
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={p.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {products.length === 0 && <p className="text-cream/60">Henüz ürün yok. "Yeni Ürün" ile ekleyin.</p>}
      </ul>
    </div>
  );
}
```

- [ ] **Adım 2: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme; `/[locale]/admin/urunler` üretilir.

- [ ] **Adım 3: Commit**

```bash
git add app/[locale]/admin/urunler/page.tsx
git commit -m "feat: ürün liste sayfası (admin)"
```

---

## Görev 9: Public Lezzetlerimiz Katalog + Ürün Kartı

**Files:**
- Create: `components/public/ProductCard.tsx`
- Create: `app/[locale]/lezzetlerimiz/page.tsx`

- [ ] **Adım 1: ProductCard.tsx oluştur (hover'da ikinci görsel)**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

export function ProductCard({
  slug,
  title,
  shortDescription,
  primaryImageUrl,
  secondaryImageUrl,
  locale,
}: {
  slug: string;
  title: Record<string, string> | null;
  shortDescription: Record<string, string> | null;
  primaryImageUrl: string | null;
  secondaryImageUrl: string | null;
  locale: Locale;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <Link href={`/lezzetlerimiz/${slug}`} className="group block overflow-hidden rounded-lg bg-forest-light">
        <div className="relative aspect-square overflow-hidden">
          {primaryImageUrl && (
            <Image src={primaryImageUrl} alt={localize(title, locale)} fill
              className="object-cover transition-opacity duration-500 group-hover:opacity-0" />
          )}
          {secondaryImageUrl && (
            <Image src={secondaryImageUrl} alt="" fill
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
        </div>
        <div className="p-4">
          <h3 className="font-serif text-lg text-gold">{localize(title, locale)}</h3>
          <p className="mt-1 text-sm text-cream/70">{localize(shortDescription, locale)}</p>
        </div>
      </Link>
    </motion.div>
  );
}
```

- [ ] **Adım 2: Katalog sayfası oluştur (kategori filtre = query param)**

Create `app/[locale]/lezzetlerimiz/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getProducts, getCategories } from "@/lib/products";
import { localize, type Locale } from "@/lib/i18n-field";
import { ProductCard } from "@/components/public/ProductCard";

export default async function LezzetlerimizPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { locale } = await params;
  const { kategori } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const filtered = kategori ? products.filter((p) => p.categoryId === kategori) : products;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 text-center font-serif text-4xl text-gold">{t("menu")}</h1>
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        <Link href="/lezzetlerimiz"
          className={`rounded-full px-4 py-1 text-sm ${!kategori ? "bg-gold text-forest" : "border border-copper/40 text-cream"}`}>
          Tümü
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/lezzetlerimiz?kategori=${c.id}`}
            className={`rounded-full px-4 py-1 text-sm ${kategori === c.id ? "bg-gold text-forest" : "border border-copper/40 text-cream"}`}>
            {localize(c.name as Record<string, string>, locale as Locale)}
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-cream/60">Bu kategoride ürün yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} slug={p.slug} locale={locale as Locale}
              title={p.title as Record<string, string> | null}
              shortDescription={p.shortDescription as Record<string, string> | null}
              primaryImageUrl={p.primaryImageUrl} secondaryImageUrl={p.secondaryImageUrl} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Adım 2b: Bu rota dynamic olmalı (DB okur)**

`app/[locale]/lezzetlerimiz/page.tsx` üstüne ekle:

```tsx
export const dynamic = "force-dynamic";
```

- [ ] **Adım 3: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı; `/[locale]/lezzetlerimiz` üretilir.

- [ ] **Adım 4: Commit**

```bash
git add components/public/ProductCard.tsx app/[locale]/lezzetlerimiz/page.tsx
git commit -m "feat: public Lezzetlerimiz katalog + ürün kartı (hover animasyon)"
```

---

## Görev 10: Ürün Detay Sayfası

**Files:**
- Create: `app/[locale]/lezzetlerimiz/[slug]/page.tsx`

- [ ] **Adım 1: Ürün detay sayfası oluştur**

```tsx
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/lib/products";
import { localize, type Locale } from "@/lib/i18n-field";

export const dynamic = "force-dynamic";

export default async function UrunDetayPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const loc = locale as Locale;
  const ingredients = (product.ingredients as string[] | null) ?? [];

  return (
    <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-forest-light">
        {product.primaryImageUrl && (
          <Image src={product.primaryImageUrl} alt={localize(product.title as Record<string, string>, loc)}
            fill className="object-cover" priority />
        )}
      </div>
      <div>
        <h1 className="font-serif text-4xl text-gold">
          {localize(product.title as Record<string, string>, loc)}
        </h1>
        <p className="mt-4 text-cream/80">
          {localize(product.shortDescription as Record<string, string> | null, loc)}
        </p>
        {ingredients.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif text-lg text-copper">İçindekiler</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="rounded-full border border-copper/40 px-3 py-1 text-sm text-cream/80">
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Adım 2: Build ile doğrula**

Run: `npm run build`
Expected: Başarılı derleme.

- [ ] **Adım 3: Commit**

```bash
git add app/[locale]/lezzetlerimiz/[slug]/page.tsx
git commit -m "feat: ürün detay sayfası"
```

---

## Görev 11: Ana Sayfa Öne Çıkanlar Slider'ı

**Files:**
- Create: `components/public/FeaturedSlider.tsx`
- Modify: `app/[locale]/page.tsx`

- [ ] **Adım 1: FeaturedSlider.tsx oluştur (yatay kaydırmalı)**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

type Item = {
  id: string;
  slug: string;
  title: Record<string, string> | null;
  primaryImageUrl: string | null;
};

export function FeaturedSlider({ items, locale, heading }: { items: Item[]; locale: Locale; heading: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="mb-8 text-center font-serif text-3xl text-gold">{heading}</h2>
      <div className="flex snap-x gap-6 overflow-x-auto pb-4">
        {items.map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="w-64 shrink-0 snap-start">
            <Link href={`/lezzetlerimiz/${p.slug}`} className="group block overflow-hidden rounded-lg bg-forest-light">
              <div className="relative aspect-square overflow-hidden">
                {p.primaryImageUrl && (
                  <Image src={p.primaryImageUrl} alt={localize(p.title, locale)} fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
              </div>
              <p className="p-3 text-center font-serif text-gold">{localize(p.title, locale)}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Adım 2: Ana sayfaya slider'ı ekle**

`app/[locale]/page.tsx`'i güncelle (mevcut hero korunur, altına slider eklenir):

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { getFeaturedProducts } from "@/lib/products";
import { localize, type Locale } from "@/lib/i18n-field";
import { FeaturedSlider } from "@/components/public/FeaturedSlider";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const tn = await getTranslations("nav");
  const [settings, featured] = await Promise.all([getSiteSettings(), getFeaturedProducts()]);
  const loc = locale as Locale;
  const title = localize(settings?.heroTitle as Record<Locale, string> | null, loc) || t("title");

  return (
    <>
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
        <h1 className="font-serif text-4xl md:text-6xl text-cream max-w-3xl">{title}</h1>
        <div className="flex gap-4">
          <Link href="/lezzetlerimiz" className="rounded bg-gold px-6 py-3 font-medium text-forest">{t("discover")}</Link>
          <Link href="/bayilik" className="rounded border border-copper px-6 py-3 font-medium text-cream">{t("franchise")}</Link>
        </div>
      </section>
      <FeaturedSlider
        items={featured.map((p) => ({
          id: p.id, slug: p.slug,
          title: p.title as Record<string, string> | null,
          primaryImageUrl: p.primaryImageUrl,
        }))}
        locale={loc}
        heading={tn("menu")}
      />
    </>
  );
}
```

**Not:** Hero CTA linkleri artık `/lezzetlerimiz` ve `/bayilik`'e gidiyor (önceki `#` yerine). `/bayilik` henüz yok (sonraki dilim) — şimdilik 404 verir; bu kabul edilebilir, sonraki planda eklenecek.

- [ ] **Adım 3: Build + test**

Run: `npm run build` → success.
Run: `npm test` → all pass.

- [ ] **Adım 4: Commit**

```bash
git add components/public/FeaturedSlider.tsx app/[locale]/page.tsx
git commit -m "feat: ana sayfa öne çıkan ürünler slider'ı"
```

---

## Faz 3a Tamamlanma Kriterleri
- [ ] Admin → Site Ayarları'ndan logo yüklenince header'da logo görünür (yoksa metin wordmark).
- [ ] Admin → Kategoriler'den kategori eklenip silinebilir.
- [ ] Admin → Ürünler'den ürün eklenir (görsel yüklenerek), düzenlenir, silinir; öne çıkar işaretlenir.
- [ ] Görseller Supabase Storage "media" bucket'ına yüklenir; public URL DB'ye yazılır.
- [ ] Public `/lezzetlerimiz` ürünleri grid'de gösterir, kategori filtreler, hover'da ikinci görsel gelir.
- [ ] `/lezzetlerimiz/[slug]` ürün detayını gösterir.
- [ ] Ana sayfada öne çıkan ürünler slider'ı görünür.
- [ ] `npm test` ve `npm run build` geçer.

## Manuel Doğrulama (insan, gerçek DB + Storage)
1. Supabase'de "media" public bucket oluştur; `.env`'e `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` ekle.
2. `npm run dev`, admin'e gir.
3. Site Ayarları → logo yükle → header'da gör.
4. Kategoriler → "Klasik", "Spesiyal" ekle.
5. Ürünler → "Fıstıklı Künefe" ekle, görseller yükle, öne çıkar işaretle.
6. `/lezzetlerimiz`'de ürünü gör, karta hover yap, detaya gir, ana sayfada slider'da gör.

## Sonraki Dilimler (ayrı planlar)
- **Faz 3b:** Malzemelerimiz interaktif harita (admin pin CRUD + SVG harita) + Reels şeridi (admin + public).
- **Faz 3c:** Bayilik sayfası (başvuru formu → DB + WhatsApp bildirim, SSS, tescil rozeti) + İletişim (şubeler).
- **Faz 3d:** Hero video banner + marka hikâyesi parallax (admin'den medya).
- **Faz 5:** SEO (meta/OG/schema/sitemap) + cache optimizasyonu (force-dynamic → "use cache" + tag).
```
