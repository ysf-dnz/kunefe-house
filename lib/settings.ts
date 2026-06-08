import { cache } from "react";
import { prisma } from "./prisma";

// Public sayfalar dynamic render edildiği için (bkz. app/[locale]/layout.tsx
// `export const dynamic = "force-dynamic"`), her istekte taze okunur; admin
// kaydı anında yansır. React cache() aynı istek içinde tekrar sorguyu önler.
export const getSiteSettings = cache(async () => {
  return prisma.siteSettings.findUnique({ where: { id: 1 } });
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({ orderBy: { order: "asc" } });
});
