import { cache } from "react";
import { prisma } from "./prisma";

export const getUsers = cache(async () => {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { branch: { select: { name: true } } },
  });
});
