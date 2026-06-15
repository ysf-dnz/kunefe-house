import { cache } from "react";
import { prisma } from "./prisma";

type Central = { price: number | null };
type Override = { available: boolean; stock: number | null; localPrice: number | null } | null;

export function effectiveProduct(central: Central, override: Override): {
  available: boolean;
  stock: number | null;
  price: number | null;
} {
  const stock = override?.stock ?? null;
  const available = (override?.available ?? true) && stock !== 0;
  const price = override?.localPrice ?? central.price ?? null;
  return { available, stock, price };
}

/** Tüm katalog + verilen şubenin override'larıyla birleştirilmiş liste. */
export const getBranchMenu = cache(async (branchId: string) => {
  const [products, overrides] = await Promise.all([
    prisma.product.findMany({ orderBy: { order: "asc" } }),
    prisma.branchProduct.findMany({ where: { branchId } }),
  ]);
  const map = new Map(overrides.map((o) => [o.productId, o]));
  return products.map((p) => ({ product: p, override: map.get(p.id) ?? null }));
});
