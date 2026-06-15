import { cache } from "react";
import { prisma } from "./prisma";

export const getOrders = cache(async (branchId?: string) => {
  return prisma.order.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { courier: true, branch: { select: { id: true, name: true } } },
  });
});
