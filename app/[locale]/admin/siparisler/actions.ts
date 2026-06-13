"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

export async function updateOrderStatus(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "new";
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/siparisler");
}

export async function deleteOrder(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.order.delete({ where: { id } });
  revalidatePath("/admin/siparisler");
}
