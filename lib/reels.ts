import { cache } from "react";
import { prisma } from "./prisma";

// Admin: tüm reels + bağlı ürün id'leri
export const getReels = cache(async () => {
  return prisma.reel.findMany({
    orderBy: { order: "asc" },
    include: { products: { select: { id: true } } },
  });
});

// Public ana sayfa/liste: yalnız hiçbir ürüne bağlı OLMAYAN ("genel") reels
export const getGeneralReels = cache(async () => {
  return prisma.reel.findMany({
    where: { products: { none: {} } },
    orderBy: { order: "asc" },
  });
});
