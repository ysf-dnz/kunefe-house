import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Korumalı admin sayfaları için savunma derinliği (defense-in-depth).
 * Middleware zaten /admin/* (login hariç) için yönlendirir; bu, middleware
 * atlansa dahi korumalı sayfa içeriğinin anonim kullanıcıya render olmasını engeller.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/admin/login");
  return session;
}
