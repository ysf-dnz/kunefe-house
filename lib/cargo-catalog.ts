import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import type { ShippingConfig } from "@/lib/shipping";

/** Mağazada listelenecek kargo ürünleri: işaretli + (stok null veya >0). */
export const getCargoProducts = cache(async () => {
  return prisma.product.findMany({
    where: {
      cargoAvailable: true,
      OR: [{ cargoStock: null }, { cargoStock: { gt: 0 } }],
    },
    orderBy: { order: "asc" },
    select: {
      id: true, title: true, slug: true, shortDescription: true,
      primaryImageUrl: true, price: true, oldPrice: true, cargoStock: true,
    },
  });
});

export async function getShippingConfig(): Promise<ShippingConfig> {
  const s = await getSiteSettings().catch(() => null);
  return {
    fee: s?.shippingFee != null ? Number(s.shippingFee) : null,
    threshold: s?.freeShippingThreshold != null ? Number(s.freeShippingThreshold) : null,
  };
}

export async function isCargoEnabled(): Promise<boolean> {
  const s = await getSiteSettings().catch(() => null);
  return !!s?.cargoEnabled;
}
