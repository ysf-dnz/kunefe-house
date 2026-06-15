import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type GeoBranch = { id: string; name: string; lat: number | null; lng: number | null };

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestBranch<T extends GeoBranch>(lat: number, lng: number, branches: T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const b of branches) {
    if (b.lat == null || b.lng == null) continue;
    const d = haversine(lat, lng, b.lat, b.lng);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

export const getActiveBranches = cache(async () => {
  return prisma.branch.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
});

export const getSelectedBranch = cache(async () => {
  const id = (await cookies()).get("kh_branch")?.value;
  if (!id) return null;
  return prisma.branch.findFirst({ where: { id, isActive: true } });
});
