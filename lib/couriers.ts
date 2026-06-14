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

/** Canlı harita verisi: konumu olan kuryeler + aktif (teslim edilmemiş) siparişler. */
export const getTrackingSnapshot = cache(async () => {
  const [couriers, orders] = await Promise.all([
    prisma.courier.findMany({
      where: { isActive: true, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, lat: true, lng: true, lastSeenAt: true },
    }),
    prisma.order.findMany({
      where: { status: { notIn: ["delivered", "cancelled"] }, lat: { not: null }, lng: { not: null } },
      select: { id: true, lat: true, lng: true, customerName: true, productTitle: true },
    }),
  ]);
  return { couriers, orders };
});
