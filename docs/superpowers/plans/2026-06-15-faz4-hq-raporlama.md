# Faz 4 — HQ Raporlama Konsolu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HQ için `/admin/rapor` — tarih aralıklı şubeler-arası özet (sipariş/ciro para-birimine göre/teslimat), şube tablosu, en çok satanlar, düşük stok.

**Architecture:** Salt-okunur, HQ-only. `lib/report.ts`: saf `rangeStart` (TDD) + `getReport` (siparişleri çekip JS'te gruplar). Sayfa sayı kartları + tablolar. Decimal→toNumber, mevcut duration/price yardımcıları.

**Tech Stack:** Next.js 16.2, Prisma 7.8, Vitest.

---

## File Structure
- `lib/report.ts` (+test) — rangeStart + getReport.
- `app/[locale]/admin/rapor/page.tsx` — HQ rapor sayfası.
- `app/[locale]/admin/layout.tsx` — HQ "Rapor" linki.

---

## Task 1: `lib/report.ts` — rangeStart (TDD) + getReport

**Files:** Create `lib/report.ts`, `tests/unit/report.test.ts`

- [ ] **Step 1: Test (failing)**

`tests/unit/report.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rangeStart } from "@/lib/report";

const now = new Date("2026-06-15T14:30:00Z");

describe("rangeStart", () => {
  it("today → günün başı (00:00)", () => {
    const d = rangeStart("today", now)!;
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d <= now).toBe(true);
    // 24 saatten yakın
    expect(now.getTime() - d.getTime()).toBeLessThanOrEqual(24 * 3600 * 1000);
  });
  it("7g → ~7 gün önce", () => {
    const d = rangeStart("7g", now)!;
    expect(Math.round((now.getTime() - d.getTime()) / (24 * 3600 * 1000))).toBe(7);
  });
  it("30g → ~30 gün önce", () => {
    const d = rangeStart("30g", now)!;
    expect(Math.round((now.getTime() - d.getTime()) / (24 * 3600 * 1000))).toBe(30);
  });
  it("all → null (filtre yok)", () => {
    expect(rangeStart("all", now)).toBeNull();
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/report.test.ts`
Expected: FAIL.

- [ ] **Step 3: `lib/report.ts` yaz**
```ts
import { cache } from "react";
import { prisma } from "./prisma";
import { toNumber } from "./price";
import { minutesBetween } from "./duration";

export type RangeKey = "today" | "7g" | "30g" | "all";

export function rangeStart(range: RangeKey, now: Date = new Date()): Date | null {
  if (range === "all") return null;
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = range === "30g" ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 3600 * 1000);
}

type Rev = { TRY: number; USD: number; QAR: number };
function addRev(rev: Rev, currency: string, amount: number) {
  if (currency === "USD") rev.USD += amount;
  else if (currency === "QAR") rev.QAR += amount;
  else rev.TRY += amount;
}

export const getReport = cache(async (range: RangeKey) => {
  const start = rangeStart(range);
  const orders = await prisma.order.findMany({
    where: start ? { createdAt: { gte: start } } : undefined,
    select: {
      branchId: true, price: true, currency: true, status: true,
      assignedAt: true, deliveredAt: true, productTitle: true,
      branch: { select: { id: true, name: true } },
    },
  });

  const summary = { orders: orders.length, delivered: 0, revenue: { TRY: 0, USD: 0, QAR: 0 } as Rev };
  const deliveryMins: number[] = [];
  const byBranch = new Map<string, { name: string; orders: number; delivered: number; revenue: Rev; mins: number[] }>();
  const byProduct = new Map<string, number>();

  for (const o of orders) {
    const price = toNumber(o.price) ?? 0;
    if (price > 0) addRev(summary.revenue, o.currency, price);
    if (o.status === "delivered") summary.delivered += 1;
    const m = minutesBetween(o.assignedAt, o.deliveredAt);
    if (m != null) deliveryMins.push(m);

    const key = o.branchId ?? "__none__";
    const name = o.branch?.name ?? "Atanmamış";
    if (!byBranch.has(key)) byBranch.set(key, { name, orders: 0, delivered: 0, revenue: { TRY: 0, USD: 0, QAR: 0 }, mins: [] });
    const b = byBranch.get(key)!;
    b.orders += 1;
    if (o.status === "delivered") b.delivered += 1;
    if (price > 0) addRev(b.revenue, o.currency, price);
    if (m != null) b.mins.push(m);

    byProduct.set(o.productTitle, (byProduct.get(o.productTitle) ?? 0) + 1);
  }

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, c) => a + c, 0) / arr.length) : null);

  const [activeCouriers, lowStock] = await Promise.all([
    prisma.courier.count({ where: { isActive: true } }),
    prisma.branchProduct.findMany({
      where: { stock: { lte: 5, not: null } },
      include: { branch: { select: { name: true } }, product: { select: { title: true } } },
      orderBy: { stock: "asc" },
    }),
  ]);

  return {
    summary: { ...summary, avgDeliveryMin: avg(deliveryMins), activeCouriers },
    branches: [...byBranch.values()].map((b) => ({ ...b, avgDeliveryMin: avg(b.mins) })).sort((a, b) => b.orders - a.orders),
    topProducts: [...byProduct.entries()].map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    lowStock: lowStock.map((bp) => ({
      branch: bp.branch.name,
      product: (bp.product.title as Record<string, string>)?.tr ?? "—",
      stock: bp.stock ?? 0,
    })),
  };
});
```

- [ ] **Step 4: Pass + tsc**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/report.test.ts && npx tsc --noEmit`
Expected: PASS; Exit 0 (gerekirse `npx prisma generate`).

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/report.ts tests/unit/report.test.ts
git commit -m "feat: report rangeStart (TDD) + getReport aggregation"
```

---

## Task 2: HQ Rapor sayfası + sidebar

**Files:** Create `app/[locale]/admin/rapor/page.tsx`; Modify `app/[locale]/admin/layout.tsx`

- [ ] **Step 1: Sayfayı yaz**

`app/[locale]/admin/rapor/page.tsx`:
```tsx
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { requireHQ } from "@/lib/require-admin";
import { getReport, type RangeKey } from "@/lib/report";
import { formatPrice } from "@/lib/price";
import { formatDuration } from "@/lib/duration";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Bugün" }, { key: "7g", label: "7 Gün" }, { key: "30g", label: "30 Gün" }, { key: "all", label: "Tümü" },
];

function revText(r: { TRY: number; USD: number; QAR: number }) {
  const parts: string[] = [];
  if (r.TRY > 0) parts.push(formatPrice(r.TRY, "TRY")!);
  if (r.USD > 0) parts.push(formatPrice(r.USD, "USD")!);
  if (r.QAR > 0) parts.push(formatPrice(r.QAR, "QAR")!);
  return parts.length ? parts.join(" · ") : "—";
}

export default async function RaporPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const { range: rangeRaw } = await searchParams;
  const range: RangeKey = (["today", "7g", "30g", "all"] as const).includes(rangeRaw as RangeKey) ? (rangeRaw as RangeKey) : "7g";
  const r = await getReport(range);

  const card = "card-premium rounded-xl p-4";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-gold">Rapor</h1>
        <div className="flex gap-2">
          {RANGES.map((x) => (
            <Link key={x.key} href={`/admin/rapor?range=${x.key}`}
              className={`rounded-full px-3 py-1 text-sm ${range === x.key ? "pill-gold" : "btn-outline-gold"}`}>{x.label}</Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className={card}><p className="text-xs text-cream/50">Sipariş</p><p className="font-serif text-2xl text-gold">{r.summary.orders}</p></div>
        <div className={card}><p className="text-xs text-cream/50">Teslim</p><p className="font-serif text-2xl text-gold">{r.summary.delivered}</p></div>
        <div className={card}><p className="text-xs text-cream/50">Ort. teslimat</p><p className="font-serif text-2xl text-gold">{formatDuration(r.summary.avgDeliveryMin) ?? "—"}</p></div>
        <div className={card}><p className="text-xs text-cream/50">Aktif kurye</p><p className="font-serif text-2xl text-gold">{r.summary.activeCouriers}</p></div>
        <div className={`${card} col-span-2 sm:col-span-1`}><p className="text-xs text-cream/50">Ciro</p><p className="font-serif text-lg text-gold">{revText(r.summary.revenue)}</p></div>
      </div>

      <div className={card}>
        <h2 className="mb-3 font-serif text-gold">Şubeler</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-cream/50">
              <th className="py-1">Şube</th><th>Sipariş</th><th>Teslim</th><th>Ciro</th><th>Ort. teslimat</th>
            </tr></thead>
            <tbody>
              {r.branches.map((b, i) => (
                <tr key={i} className="border-t border-copper/15 text-cream/90">
                  <td className="py-2">{b.name}</td><td>{b.orders}</td><td>{b.delivered}</td>
                  <td>{revText(b.revenue)}</td><td>{formatDuration(b.avgDeliveryMin) ?? "—"}</td>
                </tr>
              ))}
              {r.branches.length === 0 && <tr><td colSpan={5} className="py-3 text-cream/50">Bu aralıkta veri yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-3 font-serif text-gold">En Çok Satanlar</h2>
          <ul className="flex flex-col gap-1 text-sm text-cream/90">
            {r.topProducts.map((p, i) => (
              <li key={i} className="flex justify-between border-b border-copper/10 py-1"><span>{p.title}</span><span className="text-gold">{p.count}</span></li>
            ))}
            {r.topProducts.length === 0 && <li className="text-cream/50">Veri yok.</li>}
          </ul>
        </div>
        <div className={card}>
          <h2 className="mb-3 font-serif text-gold">Düşük Stok (≤5)</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {r.lowStock.map((s, i) => (
              <li key={i} className="flex justify-between border-b border-copper/10 py-1 text-cream/90">
                <span>{s.product} <span className="text-cream/50">· {s.branch}</span></span><span className="text-red-400">{s.stock}</span>
              </li>
            ))}
            {r.lowStock.length === 0 && <li className="text-cream/50">Düşük stok yok.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar linki**

`app/[locale]/admin/layout.tsx` — HQ blok içinde (isHQ), `<Link href="/admin/kullanicilar">Kullanıcılar</Link>` satırının altına ekle:
```tsx
            <Link href="/admin/rapor">Rapor</Link>
```

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/rapor/page.tsx" "app/[locale]/admin/layout.tsx"
git commit -m "feat(admin): HQ rapor sayfası + sidebar linki"
```

---

## Task 3: Tam doğrulama + build + deploy

- [ ] **Step 1: testler + tsc + build**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error|admin/rapor" | head`
Expected: PASS; Exit 0; build başarılı; `/[locale]/admin/rapor` derlenmiş.

- [ ] **Step 2: Manuel doğrulama (dev)**
- HQ ile /admin/rapor → kartlar (sipariş/teslim/ort. teslimat/kurye/ciro), şube tablosu, en çok satanlar, düşük stok görünür. Aralık linkleri (Bugün/7g/30g/Tümü) veriyi değiştirir. Ciro para birimine göre ayrı.
- Şube yöneticisiyle /admin/rapor → /admin'e atılır.
- Veri yoksa çökmez.

- [ ] **Step 3: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`.)

---

## Self-Review Notları
- **Spec kapsamı:** rangeStart+getReport (T1), rapor sayfası kartlar/şube tablosu/en çok satan/düşük stok + sidebar (T2), doğrulama (T3). Tümü karşılandı.
- **Tip tutarlılığı:** `RangeKey`, `getReport` dönüş şekli (summary/branches/topProducts/lowStock) sayfayla birebir. `formatDuration`/`formatPrice`/`toNumber`/`minutesBetween` mevcut.
- **Güvenlik:** requireHQ; salt-okunur. Ciro para birimine göre; null price atlanır; ort. teslimat yalnız assignedAt+deliveredAt dolu.
- **Placeholder yok:** tam kod.
