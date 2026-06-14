# Canlı Konum Takibi (Faz B2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kurye telefonunda token'lı (login'siz) bir sayfa konumunu periyodik sunucuya gönderir; admin Leaflet/OSM haritasında canlı kuryeleri + aktif sipariş konumlarını ~15sn polling ile izler.

**Architecture:** B1'in `Courier` modeline `token/lat/lng/lastSeenAt` eklenir. `/kurye/[token]` rotası `[locale]` DIŞINDA, kendi `app/kurye/layout.tsx`'i (html/body) ile; next-intl middleware bu yolu bypass eder. Konum yazımı public token-yetkili `POST /api/kurye/[token]/konum`; admin okuma `GET /api/admin/canli-konum` (auth korumalı). Harita düz `leaflet` (react-leaflet değil) + `dynamic ssr:false`. Saf `lib/geo.ts` Vitest TDD.

**Tech Stack:** Next.js 16.2 (App Router, Route Handlers, Server Actions), React 19, Prisma 7.8 + Supabase Postgres, next-intl, Leaflet + OpenStreetMap, Vitest.

---

## File Structure

**Yeni:**
- `lib/geo.ts` — `isValidLatLng`, `isCourierLive` (saf, TDD).
- `tests/unit/geo.test.ts` — testler.
- `app/api/kurye/[token]/konum/route.ts` — kurye konum POST (public, token-yetkili).
- `app/kurye/layout.tsx` — `/kurye` için html/body + globals (locale dışı).
- `app/kurye/[token]/page.tsx` — kurye sayfası (server: token doğrula + atanmış siparişler).
- `components/courier/CourierTracker.tsx` — watchPosition + throttle POST (client).
- `app/api/admin/canli-konum/route.ts` — admin polling JSON (auth korumalı).
- `components/admin/LiveMap.tsx` — Leaflet harita (client).
- `app/[locale]/admin/canli-takip/page.tsx` — admin harita sayfası (server).

**Değişecek:**
- `prisma/schema.prisma` — Courier: token/lat/lng/lastSeenAt.
- `middleware.ts` — `/kurye` yolunu intl'den bypass.
- `lib/couriers.ts` — `getTrackingSnapshot()` (kuryeler + aktif siparişler).
- `app/[locale]/admin/kuryeler/actions.ts` — `createCourier` token üretir; yeni `ensureCourierToken`.
- `app/[locale]/admin/kuryeler/page.tsx` — "📍 Konum Linki" + "Kuryeye Gönder".
- `app/[locale]/admin/layout.tsx` — "Canlı Takip" linki.
- `package.json` — `leaflet` + `@types/leaflet`.

---

## Task 1: Bağımlılık + Şema + Migration

**Files:**
- Modify: `prisma/schema.prisma`, `package.json` (otomatik)

- [ ] **Step 1: Leaflet kur**

Run: `cd /Users/macbook/Downloads/kunefe-house && npm install leaflet@^1.9.4 && npm install -D @types/leaflet@^1.9.12`
Expected: paketler eklenir, hata yok.

- [ ] **Step 2: Courier modeline alanları ekle**

`prisma/schema.prisma` içinde `Courier` modelinde `createdAt   DateTime @default(now())` satırının ÜSTÜNE ekle:

```prisma
  token       String?   @unique
  lat         Float?
  lng         Float?
  lastSeenAt  DateTime?
```

- [ ] **Step 3: Migration üret**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name courier_location --create-only`
Expected: migration klasörü oluşur (henüz uygulanmaz — backfill ekleyeceğiz).

- [ ] **Step 4: Migration SQL'ine token backfill ekle**

Yeni oluşan `prisma/migrations/*_courier_location/migration.sql` dosyasının SONUNA ekle:

```sql
UPDATE "Courier" SET "token" = gen_random_uuid() WHERE "token" IS NULL;
```

- [ ] **Step 5: Migration'ı uygula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev`
Expected: "Applying migration ...courier_location" + "✔ Generated Prisma Client". (P1001 alınırsa 3 kez dene; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 6: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations package.json package-lock.json
git commit -m "feat(db): Courier token/lat/lng/lastSeenAt + leaflet bağımlılığı"
```

---

## Task 2: `lib/geo.ts` — saf yardımcılar (TDD)

**Files:**
- Create: `lib/geo.ts`
- Test: `tests/unit/geo.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/geo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isValidLatLng, isCourierLive } from "@/lib/geo";

describe("isValidLatLng", () => {
  it("geçerli koordinatı kabul eder", () => {
    expect(isValidLatLng(41.01, 28.97)).toBe(true);
    expect(isValidLatLng(-90, -180)).toBe(true);
    expect(isValidLatLng(90, 180)).toBe(true);
  });
  it("aralık dışını reddeder", () => {
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, 181)).toBe(false);
    expect(isValidLatLng(-91, 0)).toBe(false);
  });
  it("sayı olmayanı reddeder", () => {
    expect(isValidLatLng(NaN, 0)).toBe(false);
    expect(isValidLatLng(0, Infinity)).toBe(false);
  });
});

describe("isCourierLive", () => {
  const now = 1_000_000_000_000;
  it("eşik içindeyse canlı", () => {
    expect(isCourierLive(new Date(now - 2 * 60 * 1000).toISOString(), now)).toBe(true);
  });
  it("eşik dışındaysa canlı değil", () => {
    expect(isCourierLive(new Date(now - 10 * 60 * 1000).toISOString(), now)).toBe(false);
  });
  it("null/undefined canlı değil", () => {
    expect(isCourierLive(null, now)).toBe(false);
    expect(isCourierLive(undefined, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır (fail doğrula)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/geo.test.ts`
Expected: FAIL — `Cannot find module '@/lib/geo'`.

- [ ] **Step 3: `lib/geo.ts` yaz**

```ts
export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

const LIVE_THRESHOLD_MS = 5 * 60 * 1000;

export function isCourierLive(
  lastSeenAt: string | Date | null | undefined,
  nowMs: number = Date.now(),
  thresholdMs: number = LIVE_THRESHOLD_MS
): boolean {
  if (!lastSeenAt) return false;
  const t = lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime();
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= thresholdMs;
}
```

- [ ] **Step 4: Testi çalıştır (pass doğrula)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/geo.ts tests/unit/geo.test.ts
git commit -m "feat: geo yardımcıları (isValidLatLng/isCourierLive) + testler"
```

---

## Task 3: Kurye konum POST endpoint

**Files:**
- Create: `app/api/kurye/[token]/konum/route.ts`

- [ ] **Step 1: Endpoint'i yaz**

`app/api/kurye/[token]/konum/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidLatLng } from "@/lib/geo";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const courier = await prisma.courier.findUnique({ where: { token }, select: { id: true } });
  if (!courier) return NextResponse.json({ error: "Geçersiz token" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Geçersiz konum" }, { status: 400 });
  }

  await prisma.courier.update({
    where: { id: courier.id },
    data: { lat, lng, lastSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/api/kurye/[token]/konum/route.ts"
git commit -m "feat(api): kurye konum POST (token-yetkili, lat/lng doğrulama)"
```

---

## Task 4: Kurye route altyapısı (layout + middleware bypass)

**Files:**
- Create: `app/kurye/layout.tsx`
- Modify: `middleware.ts`

- [ ] **Step 1: `/kurye` layout'u yaz (html/body — locale dışı)**

`app/kurye/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import "../globals.css";

export default function KuryeLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Middleware'de `/kurye`'yi bypass et**

`middleware.ts` içinde, `export default auth((req) => {` gövdesinin EN BAŞINA (pathname tanımından sonra) ekle:

```ts
  // /kurye/* locale dışı, login'siz — next-intl'i atla
  if (pathname.startsWith("/kurye")) {
    return NextResponse.next();
  }
```

Yani son hali:
```ts
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/kurye")) {
    return NextResponse.next();
  }
  const isAdmin =
    /^\/(tr|en|ar)?\/?admin(?!\/login)/.test(pathname) || /^\/admin(?!\/login)/.test(pathname);
  const isLoggedIn = !!req.auth;
  if (isAdmin && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return intlMiddleware(req);
});
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add app/kurye/layout.tsx middleware.ts
git commit -m "feat: /kurye route altyapısı (layout html/body + middleware bypass)"
```

---

## Task 5: CourierTracker bileşeni (watchPosition + POST)

**Files:**
- Create: `components/courier/CourierTracker.tsx`

- [ ] **Step 1: Bileşeni yaz**

`components/courier/CourierTracker.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const MIN_INTERVAL_MS = 10_000;

export function CourierTracker({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "ok" | "denied" | "unsupported">("idle");
  const lastSent = useRef(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState("ok");
        const now = Date.now();
        if (now - lastSent.current < MIN_INTERVAL_MS) return;
        lastSent.current = now;
        fetch(`/api/kurye/${token}/konum`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => { /* best-effort, watchPosition devam eder */ });
      },
      () => setState("denied"),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  const label =
    state === "ok" ? "📍 Konum paylaşılıyor ✓"
    : state === "denied" ? "Konum izni gerekli — tarayıcı ayarlarından izin verin"
    : state === "unsupported" ? "Bu cihaz konum paylaşımını desteklemiyor"
    : "Konum başlatılıyor…";

  const cls =
    state === "ok" ? "bg-green-500/15 text-green-400 border-green-500/40"
    : state === "denied" || state === "unsupported" ? "bg-red-500/15 text-red-400 border-red-500/40"
    : "bg-gold/10 text-gold border-gold/40";

  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{label}</div>;
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/courier/CourierTracker.tsx
git commit -m "feat: CourierTracker (watchPosition + throttle POST)"
```

---

## Task 6: Kurye sayfası (server)

**Files:**
- Create: `app/kurye/[token]/page.tsx`

- [ ] **Step 1: Sayfayı yaz**

`app/kurye/[token]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CourierTracker } from "@/components/courier/CourierTracker";

export const dynamic = "force-dynamic";

export default async function KuryePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const courier = await prisma.courier.findUnique({ where: { token } });
  if (!courier) notFound();

  const orders = await prisma.order.findMany({
    where: { courierId: courier.id, status: { notIn: ["delivered", "cancelled"] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-forest p-5 text-cream">
      <h1 className="font-serif text-2xl text-gold">Merhaba {courier.name}</h1>
      <CourierTracker token={token} />

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-copper">Aktif Siparişlerin ({orders.length})</h2>
        {orders.length === 0 && <p className="text-sm text-cream/60">Şu an atanmış siparişin yok.</p>}
        {orders.map((o) => {
          const maps = o.locationUrl ?? (o.lat != null && o.lng != null ? `https://maps.google.com/?q=${o.lat},${o.lng}` : null);
          return (
            <div key={o.id} className="rounded-xl border border-copper/30 bg-forest-light/40 p-4">
              <p className="font-medium text-cream">{o.productTitle}{o.persons ? ` · ${o.persons} kişilik` : ""}</p>
              <p className="text-sm text-cream/70">{o.customerName ?? "—"}</p>
              {o.addressNote && <p className="mt-1 text-sm text-cream/60">{o.addressNote}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {maps && (
                  <a href={maps} target="_blank" rel="noopener noreferrer"
                    className="rounded-full bg-gold/20 px-4 py-1.5 text-sm text-gold">📍 Yol Tarifi</a>
                )}
                {o.customerPhone && (
                  <a href={`tel:${o.customerPhone.replace(/[^0-9+]/g, "")}`}
                    className="rounded-full bg-copper/20 px-4 py-1.5 text-sm text-copper">📞 Ara</a>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Tip kontrolü + dev doğrulama**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/kurye/[token]/page.tsx"
git commit -m "feat: kurye sayfası (token doğrula + konum paylaşımı + atanmış siparişler)"
```

---

## Task 7: Kurye token üretimi + admin link butonları

**Files:**
- Modify: `app/[locale]/admin/kuryeler/actions.ts`
- Modify: `app/[locale]/admin/kuryeler/page.tsx`

- [ ] **Step 1: `createCourier`'a token ekle + `ensureCourierToken` yaz**

`app/[locale]/admin/kuryeler/actions.ts` — dosya başına ekle:
```ts
import { randomUUID } from "crypto";
```

`createCourier` içindeki `prisma.courier.create` çağrısını değiştir:
```ts
  await prisma.courier.create({ data: { name, phone, vehicle, note, token: randomUUID() } });
```

Dosya SONUNA ekle:
```ts
export async function ensureCourierToken(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const c = await prisma.courier.findUnique({ where: { id }, select: { token: true } });
  if (c && !c.token) {
    await prisma.courier.update({ where: { id }, data: { token: randomUUID() } });
  }
  revalidatePath("/admin/kuryeler");
}
```

- [ ] **Step 2: Kuryeler sayfasına token alanını ve link butonlarını ekle**

`app/[locale]/admin/kuryeler/page.tsx`:

(a) importlara ekle:
```ts
import { SITE_URL } from "@/lib/seo";
import { createCourier, toggleAvailability, toggleActive, deleteCourier, ensureCourierToken } from "./actions";
```
(mevcut `import { createCourier, ... } from "./actions";` satırını bununla değiştir.)

(b) Aksiyon `<div className="flex flex-wrap items-center gap-2">` bloğunun İÇİNE, mevcut WhatsApp `<a>`'dan hemen sonra ekle:
```tsx
              {c.token ? (
                <>
                  <a href={`${SITE_URL}/kurye/${c.token}`} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">📍 Konum Linki</a>
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Konum paylaşım sayfan: ${SITE_URL}/kurye/${c.token}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">Linki Kuryeye Gönder</a>
                </>
              ) : (
                <form action={ensureCourierToken}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">📍 Konum Linki Üret</button>
                </form>
              )}
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/kuryeler/actions.ts" "app/[locale]/admin/kuryeler/page.tsx"
git commit -m "feat(admin): kurye token üretimi + konum linki/WhatsApp butonları"
```

---

## Task 8: Tracking snapshot helper + admin polling endpoint

**Files:**
- Modify: `lib/couriers.ts`
- Create: `app/api/admin/canli-konum/route.ts`

- [ ] **Step 1: `getTrackingSnapshot` ekle**

`lib/couriers.ts` SONUNA ekle:
```ts
/** Canlı harita verisi: konumu olan kuryeler + aktif (teslim edilmemiş) siparişler. */
export const getTrackingSnapshot = cache(async () => {
  const [couriers, orders] = await Promise.all([
    prisma.courier.findMany({
      where: { isActive: true, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, lat: true, lng: true, lastSeenAt: true },
    }),
    prisma.order.findMany({
      where: { status: { notIn: ["delivered", "cancelled"] }, lat: { not: null }, lng: { not: null } },
      select: { id: true, lat: true, lng: true, customerName: true, productTitle: true },
    }),
  ]);
  return { couriers, orders };
});
```

- [ ] **Step 2: Polling endpoint'i yaz**

`app/api/admin/canli-konum/route.ts`:
```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTrackingSnapshot } from "@/lib/couriers";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const data = await getTrackingSnapshot();
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/couriers.ts "app/api/admin/canli-konum/route.ts"
git commit -m "feat(api): canlı takip snapshot + admin polling endpoint (auth korumalı)"
```

---

## Task 9: LiveMap bileşeni (Leaflet)

**Files:**
- Create: `components/admin/LiveMap.tsx`

- [ ] **Step 1: Bileşeni yaz**

`components/admin/LiveMap.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isCourierLive } from "@/lib/geo";

type Courier = { id: string; name: string; lat: number | null; lng: number | null; lastSeenAt: string | null };
type OrderPin = { id: string; lat: number | null; lng: number | null; customerName: string | null; productTitle: string };
type Snapshot = { couriers: Courier[]; orders: OrderPin[] };

function emojiIcon(emoji: string) {
  return L.divIcon({
    html: `<div style="font-size:24px;line-height:24px">${emoji}</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function LiveMap({ initial }: { initial: Snapshot }) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("live-map").setView([39.0, 35.0], 6); // Türkiye varsayılan
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    function render(data: Snapshot) {
      const layer = layerRef.current!;
      layer.clearLayers();
      const pts: [number, number][] = [];
      const now = Date.now();
      for (const c of data.couriers) {
        if (c.lat == null || c.lng == null || !isCourierLive(c.lastSeenAt, now)) continue;
        L.marker([c.lat, c.lng], { icon: emojiIcon("🛵") })
          .bindPopup(`<b>${c.name}</b>`).addTo(layer);
        pts.push([c.lat, c.lng]);
      }
      for (const o of data.orders) {
        if (o.lat == null || o.lng == null) continue;
        L.marker([o.lat, o.lng], { icon: emojiIcon("🏠") })
          .bindPopup(`<b>${o.customerName ?? "Müşteri"}</b><br>${o.productTitle}`).addTo(layer);
        pts.push([o.lat, o.lng]);
      }
      if (pts.length > 0) mapRef.current!.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    }

    render(initial);

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/canli-konum", { cache: "no-store" });
        if (res.ok) render(await res.json());
      } catch { /* polling best-effort */ }
    }, 15_000);

    return () => {
      clearInterval(id);
      map.remove();
      mapRef.current = null;
    };
  }, [initial]);

  return <div id="live-map" className="h-[70vh] w-full rounded-xl" />;
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/admin/LiveMap.tsx
git commit -m "feat(admin): LiveMap Leaflet bileşeni (canlı kurye + sipariş marker, 15sn polling)"
```

---

## Task 10: Admin Canlı Takip sayfası + sidebar

**Files:**
- Create: `app/[locale]/admin/canli-takip/page.tsx`
- Modify: `app/[locale]/admin/layout.tsx`

- [ ] **Step 1: Sayfayı yaz (LiveMap dynamic ssr:false)**

`app/[locale]/admin/canli-takip/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import { requireAdmin } from "@/lib/require-admin";
import { getTrackingSnapshot } from "@/lib/couriers";

const LiveMap = dynamic(() => import("@/components/admin/LiveMap").then((m) => m.LiveMap), { ssr: false });

export default async function CanliTakipPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const snapshot = await getTrackingSnapshot();
  // Date -> ISO string (client/JSON tutarlılığı)
  const initial = {
    couriers: snapshot.couriers.map((c) => ({ ...c, lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : null })),
    orders: snapshot.orders,
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl text-gold">Canlı Takip</h1>
      <p className="text-sm text-cream/60">🛵 Canlı kuryeler (son 5 dk) · 🏠 Aktif sipariş konumları · 15 sn'de bir güncellenir.</p>
      <LiveMap initial={initial} />
    </div>
  );
}
```

- [ ] **Step 2: Sidebar linki ekle**

`app/[locale]/admin/layout.tsx` — `<Link href="/admin/kuryeler">Kuryeler</Link>` satırının altına ekle:
```tsx
        <Link href="/admin/canli-takip">Canlı Takip</Link>
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

> Not: Next 16'da bir Server Component içinde `next/dynamic` + `ssr:false` kullanımı destekleniyor. Eğer build "ssr:false is not allowed in Server Components" hatası verirse: `LiveMap.tsx` zaten `"use client"` olduğundan, bu sayfada `dynamic(..., { ssr:false })` yerine doğrudan `import { LiveMap }` kullan ve sayfanın en üstüne yorum ekleme — client component kendi `window` erişimini `useEffect` içinde yaptığı için SSR güvenli. (İlk tercih dynamic ssr:false; hata olursa bu fallback.)

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/canli-takip/page.tsx" "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): Canlı Takip sayfası + sidebar linki"
```

---

## Task 11: Tam doğrulama + build + deploy

**Files:** (yok — doğrulama)

- [ ] **Step 1: Tüm testler**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run`
Expected: Tüm testler PASS (geo dahil; eski testler bozulmamış).

- [ ] **Step 2: Tip + build**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit && npm run build`
Expected: tsc Exit 0; build başarılı; `/kurye/[token]`, `/[locale]/admin/canli-takip`, `/api/kurye/[token]/konum`, `/api/admin/canli-konum` derlenmiş. (Leaflet `ssr:false` build'i kırmaz.)

- [ ] **Step 3: Manuel önizleme (dev server)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Admin > Kuryeler → bir kuryede "📍 Konum Linki" görünür; linki yeni sekmede aç → `/kurye/{token}` açılır, "Merhaba {ad}" + konum izni istenir; izin verince "Konum paylaşılıyor ✓".
- DevTools > Sensors ile konum simüle et → ~10sn sonra DB'de Courier.lat/lng/lastSeenAt güncellenir.
- O kuryeye Siparişler'den aktif bir sipariş ata → kurye sayfasında "Aktif Siparişlerin" listesinde görünür + "Yol Tarifi" linki.
- Admin > Canlı Takip → harita açılır; canlı kurye 🛵 ve aktif sipariş 🏠 marker'ları görünür; ~15sn'de güncellenir.
- Geçersiz token `/kurye/yanlis` → 404.
- `/api/admin/canli-konum` auth'suz (gizli sekme) → 401.

- [ ] **Step 4: Push (deploy)**

```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge stratejisini `finishing-a-development-branch` belirler.)

---

## Self-Review Notları (plan yazarı tarafından doğrulandı)

- **Spec kapsamı:** token/lat/lng/lastSeenAt + backfill (Task 1), kurye sayfası otomatik paylaşım (Task 5,6), konum POST + aralık doğrulama (Task 3), admin Leaflet harita + 5dk canlı eşiği + 15sn polling (Task 9,10), polling auth (Task 8), kuryeye atanmış siparişler (Task 6), token link dağıtımı (Task 7), düz leaflet+ssr:false (Task 9,10), güvenlik (Task 3,8) — tümü karşılandı. Ek olarak spec'te örtük olan iki altyapı tuzağı (kök layout html/body eksik, intl middleware /kurye'yi yakalar) Task 4 ile çözüldü.
- **Tip tutarlılığı:** `isValidLatLng`/`isCourierLive` imzaları Task 2'de tanımlı, Task 3/9'da aynı şekilde kullanılıyor. `getTrackingSnapshot` dönüş şekli (couriers: {id,name,lat,lng,lastSeenAt}, orders: {id,lat,lng,customerName,productTitle}) Task 8'de tanımlı, Task 9 `Snapshot`/`Courier`/`OrderPin` tipleriyle ve Task 10 ISO dönüşümüyle birebir uyumlu. `token` alanı Task 1'de eklendi, Task 3/6/7'de kullanılıyor.
- **Serileştirme:** `lastSeenAt` Date → Task 10'da ISO string'e çevrilip client'a geçiyor; polling endpoint JSON'u da ISO döner (NextResponse.json). LiveMap `isCourierLive(string)` ile uyumlu. Decimal yok (lat/lng Float).
- **Placeholder yok:** Tüm adımlar tam kod. Task 10'da olası `ssr:false` build hatası için somut fallback verildi.
