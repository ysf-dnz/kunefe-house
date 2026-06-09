import { cache } from "react";
import { prisma } from "./prisma";

export const getPublishedNews = cache(async () => {
  return prisma.news.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
});

export const getAllNews = cache(async () => {
  return prisma.news.findMany({ orderBy: { createdAt: "desc" } });
});

/** Sitede gösterilecek aktif popup haberi (yayında + asPopup) */
export const getPopupNews = cache(async () => {
  return prisma.news.findFirst({
    where: { published: true, asPopup: true },
    orderBy: { createdAt: "desc" },
  });
});
