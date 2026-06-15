import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; role: "HQ_ADMIN" | "BRANCH_ADMIN"; branchId: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth();
  if (!s?.user) return null;
  return { id: s.user.id, role: s.user.role, branchId: s.user.branchId };
}

/** Herhangi giriş yapmış admin (yoksa login'e). */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/admin/login");
  return u;
}

/** Yalnız Genel Merkez. Şube yöneticisi /admin'e yönlenir. */
export async function requireHQ(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/admin/login");
  if (u.role !== "HQ_ADMIN") redirect("/admin");
  return u;
}

/** Sorgu filtresi: HQ → undefined (tümü); şube yöneticisi → kendi branchId ('__none__' = eşleşme yok). */
export function branchScope(u: SessionUser): string | undefined {
  if (u.role === "HQ_ADMIN") return undefined;
  return u.branchId ?? "__none__";
}
