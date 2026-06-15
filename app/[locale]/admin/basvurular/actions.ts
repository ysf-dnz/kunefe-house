"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

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
