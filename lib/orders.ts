import { cache } from "react";
import { prisma } from "./prisma";

export const getOrders = cache(async () => {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { courier: true },
  });
});
