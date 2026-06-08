import { cache } from "react";
import { prisma } from "./prisma";

export const getMapPins = cache(async () => {
  return prisma.mapPin.findMany({ orderBy: { order: "asc" } });
});
