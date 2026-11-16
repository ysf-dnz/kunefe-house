"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { nearestBranch } from "@/lib/branch-select";
import { BRANCH_COOKIE } from "@/lib/branch-cookie";

const MAXAGE = 60 * 60 * 24 * 365;
// httpOnly DEĞİL: header ve şube modali seçimi istemcide document.cookie'den okur
// (public sayfalar ISR'de önbellekli, sunucu çerez okumaz).
const OPTS = { path: "/", maxAge: MAXAGE, httpOnly: false, sameSite: "lax" } as const;

// revalidatePath YOK: şube seçimi ziyaretçiye özeldir; önbelleği silmesi gereken bir
// içerik değişikliği değildir. Çerez yazıldığı için Next mevcut rotayı zaten yeniden
// render eder (dinamik lezzetlerimiz sayfaları yeni şubeyle gelir).
export async function setBranch(branchId: string | null) {
  const jar = await cookies();
  if (!branchId) {
    jar.delete(BRANCH_COOKIE);
  } else {
    const b = await prisma.branch.findFirst({ where: { id: branchId, isActive: true }, select: { id: true } });
    if (b) jar.set(BRANCH_COOKIE, b.id, OPTS);
  }
}

export async function setNearestBranch(lat: number, lng: number): Promise<string | null> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, lat: true, lng: true },
  });
  const n = nearestBranch(lat, lng, branches);
  if (!n) return null;
  (await cookies()).set(BRANCH_COOKIE, n.id, OPTS);
  return n.name;
}
