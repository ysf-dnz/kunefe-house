import { cache } from "react";
import { prisma } from "./prisma";

export const getReels = cache(async () => {
  return prisma.reel.findMany({ orderBy: { order: "asc" } });
});
