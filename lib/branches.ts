import { cache } from "react";
import { prisma } from "./prisma";

export const getBranches = cache(async () => {
  return prisma.branch.findMany({ orderBy: { order: "asc" } });
});
