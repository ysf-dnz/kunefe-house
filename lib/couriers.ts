import { cache } from "react";
import { prisma } from "./prisma";

export const getCouriers = cache(async () => {
  return prisma.courier.findMany({ orderBy: [{ isActive: "desc" }, { order: "asc" }, { createdAt: "asc" }] });
});

/** Atama listesi: yalnız aktif + müsait kuryeler. */
export const getAvailableCouriers = cache(async () => {
  return prisma.courier.findMany({
    where: { isActive: true, isAvailable: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
});
