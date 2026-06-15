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
