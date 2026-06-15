"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { nearestBranch } from "@/lib/branch-select";

const COOKIE = "kh_branch";
const MAXAGE = 60 * 60 * 24 * 365;

export async function setBranch(branchId: string | null) {
  const jar = await cookies();
  if (!branchId) {
    jar.delete(COOKIE);
  } else {
    const b = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } });
    if (b) jar.set(COOKIE, b.id, { path: "/", maxAge: MAXAGE });
  }
  revalidatePath("/", "layout");
}

export async function setNearestBranch(lat: number, lng: number): Promise<string | null> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, lat: true, lng: true },
  });
  const n = nearestBranch(lat, lng, branches);
  if (!n) return null;
  (await cookies()).set(COOKIE, n.id, { path: "/", maxAge: MAXAGE });
  revalidatePath("/", "layout");
  return n.name;
}
