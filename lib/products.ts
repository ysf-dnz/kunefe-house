import { cache } from "react";
import { prisma } from "./prisma";

export const getProducts = cache(async () => {
  return prisma.product.findMany({ orderBy: { order: "asc" }, include: { category: true } });
});
export const getFeaturedProducts = cache(async () => {
  return prisma.product.findMany({ where: { featured: true }, orderBy: { order: "asc" }, take: 5 });
});
export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findUnique({ where: { slug }, include: { category: true } });
});
export const getCategories = cache(async () => {
  return prisma.productCategory.findMany({ orderBy: { order: "asc" } });
});
