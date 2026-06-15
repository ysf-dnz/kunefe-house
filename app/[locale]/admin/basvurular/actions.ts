"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateTempPassword } from "@/lib/temp-password";

export async function updateApplicationStatus(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  await prisma.franchiseApplication.update({ where: { id }, data: { status } });
  revalidatePath("/admin/basvurular");
}

export async function deleteApplication(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  await prisma.franchiseApplication.delete({ where: { id } });
  revalidatePath("/admin/basvurular");
}

export type OnboardState = { ok?: boolean; email?: string; tempPassword?: string; error?: string };

const clampStr = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function onboardBranch(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  await requireHQ();
  const applicationId = clampStr(formData.get("applicationId"), 64);
  const branchName = clampStr(formData.get("branchName"), 120);
  const adminEmail = clampStr(formData.get("adminEmail"), 160).toLowerCase();
  const adminName = clampStr(formData.get("adminName"), 120) || "Şube Yöneticisi";
  if (!applicationId || !branchName || !adminEmail) return { error: "Şube adı ve e-posta zorunlu" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) return { error: "Geçerli bir e-posta girin" };

  const existing = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
  if (existing) return { error: "Bu e-posta zaten kayıtlı" };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  try {
    const branch = await prisma.branch.create({ data: { name: branchName, isActive: true } });
    await prisma.user.create({
      data: { email: adminEmail, name: adminName, role: "BRANCH_ADMIN", branchId: branch.id, passwordHash },
    });
    await prisma.franchiseApplication.update({ where: { id: applicationId }, data: { status: "onboarded", branchId: branch.id } });
    revalidatePath("/admin/basvurular");
    return { ok: true, email: adminEmail, tempPassword };
  } catch {
    return { error: "Oluşturulamadı, tekrar deneyin" };
  }
}
