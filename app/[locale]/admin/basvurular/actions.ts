"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

export async function updateApplicationStatus(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  await prisma.franchiseApplication.update({ where: { id }, data: { status } });
  revalidatePath("/admin/basvurular");
}

export async function deleteApplication(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.franchiseApplication.delete({ where: { id } });
  revalidatePath("/admin/basvurular");
}
