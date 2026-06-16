import { prisma } from "@/lib/prisma";
import { getShippingConfig } from "@/lib/cargo-catalog";
import { calcShipping } from "@/lib/shipping";
import { localize } from "@/lib/i18n-field";
import type { Locale } from "@/lib/i18n-field";

export type CartLineInput = { productId: string; qty: number };
export type CustomerInput = {
  name: string; phone: string; email: string;
  city: string; district: string; address: string; postal: string | null;
};

export type CreateResult =
  | { ok: true; orderId: string; merchantOid: string; amountKurus: number; basket: { title: string; price: number; qty: number }[]; total: number }
  | { ok: false; error: "empty" | "out_of_stock" | "invalid" };

const HQ_NAME = "Merkez";

/** Sepeti DB fiyat/stok ile doğrular, ShopOrder(pending_payment) + items oluşturur. Tutar SUNUCUDA hesaplanır. */
export async function createShopOrder(
  lines: CartLineInput[],
  customer: CustomerInput,
  locale: Locale
): Promise<CreateResult> {
  const clean = lines
    .filter((l) => l.productId && Number.isFinite(l.qty) && l.qty > 0)
    .map((l) => ({ productId: l.productId, qty: Math.min(Math.round(l.qty), 99) }));
  if (clean.length === 0) return { ok: false, error: "empty" };

  const products = await prisma.product.findMany({
    where: { id: { in: clean.map((l) => l.productId) }, cargoAvailable: true },
    select: { id: true, title: true, price: true, cargoStock: true },
  });

  const items: { productId: string; title: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
  for (const l of clean) {
    const p = products.find((x) => x.id === l.productId);
    if (!p || p.price == null) return { ok: false, error: "invalid" };
    if (p.cargoStock != null && p.cargoStock < l.qty) return { ok: false, error: "out_of_stock" };
    const unit = Number(p.price);
    const title = localize(p.title as Record<string, string>, locale) || "Ürün";
    items.push({ productId: p.id, title, unitPrice: unit, qty: l.qty, lineTotal: unit * l.qty });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const fee = calcShipping(subtotal, await getShippingConfig());
  const total = subtotal + fee;
  const merchantOid = "KH" + Date.now().toString(36).toUpperCase() + Math.floor(performance.now()).toString(36).toUpperCase();
  const hq = await prisma.branch.findFirst({ where: { name: HQ_NAME }, select: { id: true } });

  const order = await prisma.shopOrder.create({
    data: {
      merchantOid, status: "pending_payment",
      customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email,
      addressCity: customer.city, addressDistrict: customer.district, addressFull: customer.address, addressPostal: customer.postal,
      subtotal, shippingFee: fee, total, currency: "TRY",
      branchId: hq?.id ?? null,
      items: { create: items.map((i) => ({ productId: i.productId, title: i.title, unitPrice: i.unitPrice, qty: i.qty, lineTotal: i.lineTotal })) },
    },
  });

  return { ok: true, orderId: order.id, merchantOid, amountKurus: Math.round(total * 100), basket: items.map((i) => ({ title: i.title, price: i.unitPrice, qty: i.qty })), total };
}

export const getShopOrders = async () =>
  prisma.shopOrder.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } });

export async function markShopOrderShipped(id: string, trackingNo: string, carrier: string) {
  await prisma.shopOrder.update({
    where: { id },
    data: { trackingNo, carrier, status: "shipped", shippedAt: new Date() },
  });
}
