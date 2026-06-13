# Kurye Yönetimi (Faz B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin'de kurye yönetimi (CRUD + müsaitlik/aktiflik), siparişe kurye atama (atayınca otomatik "Hazırlanıyor"), ve atanan kuryeye WhatsApp ile sipariş gönderme.

**Architecture:** Faz A'nın admin/Prisma/wa.me desenlerinin üzerine additive katman. Yeni `Courier` modeli + `Order.courierId/assignedAt`. Saf yardımcı `lib/courier-message.ts` Vitest TDD; admin sayfaları/aksiyonları mevcut desenleri (`guard()`, `revalidatePath`, `cache()`) izler. Kurye atama ve bildirim admin-içi; kurye yalnız WhatsApp mesajı alır (B1'de kurye-yüzlü sayfa yok).

**Tech Stack:** Next.js 16.2 (App Router, Server Actions), React 19, Prisma 7.8 (@prisma/adapter-pg + Supabase Postgres), next-intl, Tailwind v4, Vitest.

---

## File Structure

**Yeni:**
- `lib/courier-message.ts` — `buildCourierMessage` (saf, TDD).
- `tests/unit/courier-message.test.ts` — testler.
- `lib/couriers.ts` — `getCouriers`, `getAvailableCouriers` (cache'li okuma).
- `app/[locale]/admin/kuryeler/actions.ts` — `createCourier`, `toggleAvailability`, `toggleActive`, `deleteCourier`.
- `app/[locale]/admin/kuryeler/page.tsx` — kurye listesi + ekle formu.
- `components/admin/CourierAssign.tsx` — sipariş kartında kurye dropdown (Ata) + "Kuryeye Gönder" (client).

**Değişecek:**
- `prisma/schema.prisma` — `Courier` modeli + `Order.courierId`/`assignedAt`.
- `lib/orders.ts` — `getOrders`'a `include: { courier: true }`.
- `app/[locale]/admin/siparisler/actions.ts` — `assignCourier` (otomatik durum yükseltme dahil).
- `app/[locale]/admin/siparisler/page.tsx` — atanan kurye etiketi + `CourierAssign`; `preparing` durumu eklenir.
- `app/[locale]/admin/layout.tsx` — "Kuryeler" sidebar linki.

---

## Task 1: Şema + Migration (Courier + Order ilişkisi)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: `Order` modeline kurye alanlarını ekle**

`prisma/schema.prisma` içinde `Order` modelinde, `status        String   @default("new")` satırının ÜSTÜNE ekle:

```prisma
  courierId     String?
  courier       Courier? @relation(fields: [courierId], references: [id], onDelete: SetNull)
  assignedAt    DateTime?
```

- [ ] **Step 2: `Courier` modelini dosya sonuna ekle**

```prisma
model Courier {
  id          String   @id @default(cuid())
  name        String
  phone       String
  vehicle     String?
  isAvailable Boolean  @default(true)
  isActive    Boolean  @default(true)
  note        String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  orders      Order[]
}
```

- [ ] **Step 3: Migration üret ve uygula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name courier_management`
Expected: "Applying migration ...courier_management" + "✔ Generated Prisma Client".
Not: P1001 (DB erişilemez) alınırsa aynı komutu 3 kez dene; hâlâ olmazsa `npx prisma generate` çalıştır ve DONE_WITH_CONCERNS ile migration'ın uygulanmadığını bildir.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): Courier modeli + Order.courierId/assignedAt"
```

---

## Task 2: `lib/courier-message.ts` — kurye WhatsApp mesajı (TDD)

**Files:**
- Create: `lib/courier-message.ts`
- Test: `tests/unit/courier-message.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/courier-message.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildCourierMessage } from "@/lib/courier-message";

const base = {
  productTitle: "Fıstıklı Künefe",
  persons: 4,
  customerName: "Ahmet Yılmaz",
  customerPhone: "05551112233",
  addressNote: "X mah. Y sok. A apt. kat 3 D5",
  locationUrl: "https://maps.google.com/?q=41.01,28.97",
};

describe("buildCourierMessage", () => {
  it("tüm alanlarla tam teslimat mesajı üretir", () => {
    const msg = buildCourierMessage(base);
    expect(msg).toContain("Kunefe House");
    expect(msg).toContain("Teslimat");
    expect(msg).toContain("Fıstıklı Künefe");
    expect(msg).toContain("4 kişilik");
    expect(msg).toContain("Ahmet Yılmaz");
    expect(msg).toContain("05551112233");
    expect(msg).toContain("X mah. Y sok. A apt. kat 3 D5");
    expect(msg).toContain("https://maps.google.com/?q=41.01,28.97");
  });

  it("persons null ise porsiyon kısmı eklenmez", () => {
    const msg = buildCourierMessage({ ...base, persons: null });
    expect(msg).toContain("Fıstıklı Künefe");
    expect(msg).not.toContain("kişilik");
  });

  it("locationUrl yoksa 📍 satırı atlanır", () => {
    const msg = buildCourierMessage({ ...base, locationUrl: null });
    expect(msg).not.toContain("📍");
  });

  it("customerPhone yoksa 📞 satırı atlanır", () => {
    const msg = buildCourierMessage({ ...base, customerPhone: null });
    expect(msg).not.toContain("📞");
  });
});
```

- [ ] **Step 2: Testi çalıştır (fail doğrula)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/courier-message.test.ts`
Expected: FAIL — `Cannot find module '@/lib/courier-message'`.

- [ ] **Step 3: `lib/courier-message.ts` yaz**

```ts
export type CourierMessageInput = {
  productTitle: string;
  persons?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  addressNote?: string | null;
  locationUrl?: string | null;
};

/** Kuryeye gönderilen teslimat mesajı (yalnız Türkçe — kurye yerel personel). */
export function buildCourierMessage(i: CourierMessageInput): string {
  const lines: string[] = [];
  lines.push("🛵 Kunefe House — Teslimat", "");
  const portion = i.persons ? ` · ${i.persons} kişilik` : "";
  lines.push(`Sipariş: ${i.productTitle}${portion}`);
  if (i.customerName) lines.push(`👤 Müşteri: ${i.customerName}`);
  if (i.customerPhone) lines.push(`📞 Telefon: ${i.customerPhone}`);
  if (i.addressNote) lines.push(`🏠 Adres: ${i.addressNote}`);
  if (i.locationUrl) lines.push(`📍 Konum: ${i.locationUrl}`);
  lines.push("", "Lütfen siparişi teslim alıp yola çıktığında bilgi ver.");
  return lines.join("\n");
}
```

- [ ] **Step 4: Testi çalıştır (pass doğrula)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/courier-message.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/courier-message.ts tests/unit/courier-message.test.ts
git commit -m "feat: kurye WhatsApp teslimat mesajı + testler"
```

---

## Task 3: `lib/couriers.ts` — okuma yardımcıları

**Files:**
- Create: `lib/couriers.ts`

- [ ] **Step 1: Dosyayı yaz**

`lib/couriers.ts`:

```ts
import { cache } from "react";
import { prisma } from "./prisma";

export const getCouriers = cache(async () => {
  return prisma.courier.findMany({ orderBy: [{ isActive: "desc" }, { order: "asc" }, { createdAt: "asc" }] });
});

/** Atama listesi: yalnız aktif + müsait kuryeler. */
export const getAvailableCouriers = cache(async () => {
  return prisma.courier.findMany({
    where: { isActive: true, isAvailable: true },
    orderBy: { order: "asc" },
  });
});
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0 (Prisma `courier` tipi yoksa önce `npx prisma generate`).

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/couriers.ts
git commit -m "feat: kurye okuma yardımcıları (getCouriers/getAvailableCouriers)"
```

---

## Task 4: Kurye admin aksiyonları

**Files:**
- Create: `app/[locale]/admin/kuryeler/actions.ts`

- [ ] **Step 1: Aksiyonları yaz**

`app/[locale]/admin/kuryeler/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function createCourier(formData: FormData) {
  await guard();
  const name = clamp(formData.get("name"), 120);
  const phone = clamp(formData.get("phone"), 32);
  const vehicle = clamp(formData.get("vehicle"), 60) || null;
  const note = clamp(formData.get("note"), 500) || null;
  if (!name || !phone) throw new Error("Ad ve telefon zorunlu");
  await prisma.courier.create({ data: { name, phone, vehicle, note } });
  revalidatePath("/admin/kuryeler");
}

export async function toggleAvailability(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const next = formData.get("value") === "true";
  await prisma.courier.update({ where: { id }, data: { isAvailable: next } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function toggleActive(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const next = formData.get("value") === "true";
  await prisma.courier.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function deleteCourier(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.courier.delete({ where: { id } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/kuryeler/actions.ts"
git commit -m "feat(admin): kurye aksiyonları (ekle/müsaitlik/aktif/sil)"
```

---

## Task 5: Kurye admin sayfası

**Files:**
- Create: `app/[locale]/admin/kuryeler/page.tsx`

- [ ] **Step 1: Sayfayı yaz**

`app/[locale]/admin/kuryeler/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getCouriers } from "@/lib/couriers";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createCourier, toggleAvailability, toggleActive, deleteCourier } from "./actions";

export default async function KuryelerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const couriers = await getCouriers();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Kuryeler ({couriers.length})</h1>

      <form action={createCourier} className="card-premium flex max-w-xl flex-col gap-3 rounded-xl p-4">
        <h2 className="font-serif text-gold">Yeni Kurye</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Ad Soyad *"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="phone" required placeholder="Telefon *"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="vehicle" placeholder="Taşıt / plaka (ops.)"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="note" placeholder="Not (ops.)"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <SubmitButton>Kurye Ekle</SubmitButton>
      </form>

      <ul className="flex flex-col gap-3">
        {couriers.map((c) => (
          <li key={c.id} className={`card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between ${c.isActive ? "" : "opacity-50"}`}>
            <div>
              <p className="font-medium text-cream">
                {c.name}
                <span className={`ml-2 text-xs ${c.isAvailable ? "text-green-400" : "text-red-400"}`}>
                  ● {c.isAvailable ? "Müsait" : "Meşgul"}
                </span>
                {!c.isActive && <span className="ml-2 text-xs text-cream/40">(Pasif)</span>}
              </p>
              <p className="text-sm text-cream/70">{c.phone}{c.vehicle ? ` · ${c.vehicle}` : ""}</p>
              {c.note && <p className="mt-1 text-sm text-cream/50">{c.note}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">WhatsApp</a>
              <form action={toggleAvailability}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="value" value={(!c.isAvailable).toString()} />
                <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">
                  {c.isAvailable ? "Meşgul yap" : "Müsait yap"}
                </button>
              </form>
              <form action={toggleActive}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="value" value={(!c.isActive).toString()} />
                <button className="rounded bg-copper/20 px-3 py-1 text-sm text-copper">
                  {c.isActive ? "Pasifleştir" : "Aktifleştir"}
                </button>
              </form>
              <form action={deleteCourier}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-sm text-red-400">Sil</button>
              </form>
            </div>
          </li>
        ))}
        {couriers.length === 0 && <p className="text-cream/60">Henüz kurye yok.</p>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar linki ekle**

`app/[locale]/admin/layout.tsx` — `<Link href="/admin/siparisler">Siparişler</Link>` satırının altına ekle:

```tsx
        <Link href="/admin/kuryeler">Kuryeler</Link>
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/kuryeler/page.tsx" "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): Kuryeler sayfası (liste + ekle + toggle) + sidebar"
```

---

## Task 6: Sipariş atama aksiyonu (otomatik durum yükseltme)

**Files:**
- Modify: `app/[locale]/admin/siparisler/actions.ts`

- [ ] **Step 1: `assignCourier` aksiyonunu ekle**

`app/[locale]/admin/siparisler/actions.ts` dosyasının SONUNA ekle:

```ts
export async function assignCourier(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const courierId = (formData.get("courierId") as string) || null;

  const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  // Atama yapılıyorsa ve durum erken aşamadaysa otomatik "Hazırlanıyor"
  const bump = courierId && order && (order.status === "new" || order.status === "confirmed");

  await prisma.order.update({
    where: { id },
    data: {
      courierId,
      assignedAt: courierId ? new Date() : null,
      ...(bump ? { status: "preparing" } : {}),
    },
  });
  revalidatePath("/admin/siparisler");
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/siparisler/actions.ts"
git commit -m "feat(admin): siparişe kurye atama (otomatik Hazırlanıyor)"
```

---

## Task 7: CourierAssign bileşeni

**Files:**
- Create: `components/admin/CourierAssign.tsx`

- [ ] **Step 1: Bileşeni yaz**

`components/admin/CourierAssign.tsx`:

```tsx
"use client";

import { buildCourierMessage } from "@/lib/courier-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { assignCourier } from "@/app/[locale]/admin/siparisler/actions";

export type CourierLite = { id: string; name: string; phone: string };
export type AssignOrder = {
  id: string;
  productTitle: string;
  persons: number | null;
  customerName: string | null;
  customerPhone: string | null;
  addressNote: string | null;
  locationUrl: string | null;
};

export function CourierAssign({
  order, couriers, assignedId, assignedName, assignedPhone,
}: {
  order: AssignOrder;
  couriers: CourierLite[];
  assignedId: string | null;
  assignedName: string | null;
  assignedPhone: string | null;
}) {
  function sendToCourier() {
    if (!assignedPhone) return;
    const message = buildCourierMessage({
      productTitle: order.productTitle,
      persons: order.persons,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      addressNote: order.addressNote,
      locationUrl: order.locationUrl,
    });
    window.open(buildWhatsAppHref(assignedPhone, message), "_blank", "noopener,noreferrer");
  }

  // Atanmış kurye listede yoksa (pasif/meşgul) seçenek olarak ekle
  const options = [...couriers];
  if (assignedId && !options.some((c) => c.id === assignedId)) {
    options.unshift({ id: assignedId, name: assignedName ?? "Atanmış kurye", phone: assignedPhone ?? "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={assignCourier} className="flex items-center gap-2">
        <input type="hidden" name="id" value={order.id} />
        <select name="courierId" defaultValue={assignedId ?? ""}
          className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
          <option value="">— Kurye yok —</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Ata</button>
      </form>
      {assignedPhone && (
        <button type="button" onClick={sendToCourier}
          className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">🛵 Kuryeye Gönder</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/admin/CourierAssign.tsx
git commit -m "feat(admin): CourierAssign bileşeni (ata + kuryeye gönder)"
```

---

## Task 8: Siparişler sayfası entegrasyonu + preparing durumu

**Files:**
- Modify: `lib/orders.ts`
- Modify: `app/[locale]/admin/siparisler/page.tsx`

- [ ] **Step 1: `getOrders`'a courier include ekle**

`lib/orders.ts` içindeki `getOrders` gövdesini değiştir:

```ts
export const getOrders = cache(async () => {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { courier: true },
  });
});
```

- [ ] **Step 2: Siparişler sayfasını güncelle**

`app/[locale]/admin/siparisler/page.tsx`:

(a) Importlara ekle:
```ts
import { getAvailableCouriers } from "@/lib/couriers";
import { CourierAssign } from "@/components/admin/CourierAssign";
```

(b) `STATUS` nesnesine `preparing` ekle — `confirmed` satırının altına:
```ts
  confirmed: { label: "Onaylandı", cls: "text-pistachio" },
  preparing: { label: "Hazırlanıyor", cls: "text-amber-400" },
```

(c) `const orders = await getOrders();` satırının altına ekle:
```ts
  const availableCouriers = await getAvailableCouriers();
  const courierLite = availableCouriers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
```

(d) Status `<select>` içindeki `<option value="confirmed">Onaylandı</option>` satırının altına ekle:
```tsx
                  <option value="preparing">Hazırlanıyor</option>
```

(e) Atanan kurye etiketi: sipariş kartındaki müşteri satırının (`<p className="text-sm text-cream/70">...{o.customerPhone}...</p>`) ALTINA ekle:
```tsx
                {o.courier && <p className="mt-1 text-sm text-gold/90">🛵 {o.courier.name}{o.courier.phone ? ` · ${o.courier.phone}` : ""}</p>}
```

(f) `CourierAssign` bileşenini ekle: sağ aksiyon `<div className="flex flex-wrap items-center gap-2">` bloğunun İÇİNE, kapanış `</div>`'inden hemen önce (Sil formundan sonra) ekle:
```tsx
                <CourierAssign
                  order={{
                    id: o.id,
                    productTitle: o.productTitle,
                    persons: o.persons,
                    customerName: o.customerName,
                    customerPhone: o.customerPhone,
                    addressNote: o.addressNote,
                    locationUrl: o.locationUrl,
                  }}
                  couriers={courierLite}
                  assignedId={o.courierId}
                  assignedName={o.courier?.name ?? null}
                  assignedPhone={o.courier?.phone ?? null}
                />
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/orders.ts "app/[locale]/admin/siparisler/page.tsx"
git commit -m "feat(admin): siparişler sayfasına kurye atama + Hazırlanıyor durumu"
```

---

## Task 9: Tam doğrulama + build + deploy

**Files:** (yok — doğrulama)

- [ ] **Step 1: Tüm testler**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run`
Expected: Tüm testler PASS (courier-message dahil; eski testler bozulmamış).

- [ ] **Step 2: Tip kontrolü + build**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit && npm run build`
Expected: tsc Exit 0; build başarılı; `/[locale]/admin/kuryeler` derlenmiş.

- [ ] **Step 3: Manuel önizleme (dev server)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Admin > Kuryeler → kurye ekle (ad/telefon/taşıt); müsait↔meşgul, aktif↔pasif, sil çalışır.
- Admin > Siparişler → bir siparişte kurye dropdown yalnız aktif+müsait kuryeleri listeler; "Ata" → kart etiketinde "🛵 {kurye}" görünür ve durum otomatik "Hazırlanıyor" olur (yeni/onaylandı ise).
- "🛵 Kuryeye Gönder" → kuryenin WhatsApp'ı doğru teslimat mesajıyla (müşteri ad/telefon/adres/konum) yeni sekmede açılır.
- Atanan kuryeyi pasifleştir/sil → sipariş kartında kurye etiketi kalkar ama sipariş kaybolmaz.
- Kuryesiz eski siparişler eskisi gibi listelenir (regresyon yok).

- [ ] **Step 4: Push (deploy)**

```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Yürütme akışı branch/merge stratejisini `finishing-a-development-branch` ile belirler.)

---

## Self-Review Notları (plan yazarı tarafından doğrulandı)

- **Spec kapsamı:** Courier modeli+vehicle (Task 1,5), CRUD/müsaitlik/aktiflik (Task 4,5), atama+otomatik preparing (Task 6), kurye WhatsApp mesajı TR (Task 2,7), durum makinesi preparing (Task 8), güvenlik/clamp/guard (Task 4,6), FK SetNull geriye uyumluluk (Task 1,8) — tümü karşılandı.
- **Tip tutarlılığı:** `assignCourier`/`createCourier`/`toggleAvailability`/`toggleActive`/`deleteCourier` adları sayfa ve aksiyon dosyalarında birebir aynı. `CourierLite`/`AssignOrder` tipleri CourierAssign'da tanımlı; sayfa bunları düz nesne olarak besler (Decimal yok — courier alanları string/bool). `buildCourierMessage` girdisi Task 2 ile Task 7 arasında tutarlı.
- **Placeholder yok:** Tüm adımlar tam kod içerir.
- **Decimal/serileştirme:** CourierAssign'a Order'dan geçen alanlar (persons:number|null, string'ler) Decimal değil — Client Component'e güvenli.
