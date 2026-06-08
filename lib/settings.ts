import { cache } from "react";
import { prisma } from "./prisma";

export const getSiteSettings = cache(async () => {
  return prisma.siteSettings.findUnique({ where: { id: 1 } });
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({ orderBy: { order: "asc" } });
});
