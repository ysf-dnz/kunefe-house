import { cache } from "react";
import { prisma } from "./prisma";

// Public sayfalar ISR'dir (bkz. app/[locale]/layout.tsx `revalidate`); admin kaydı
// revalidatePath("/", "layout") ile anında yansır. React cache() aynı istek
// (render) içinde tekrar sorguyu önler; hata da tüm çağıranlara aynen yayılır.
export const getSiteSettings = cache(async () => {
  return prisma.siteSettings.findUnique({ where: { id: 1 } });
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({ orderBy: { order: "asc" } });
});
