"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function updateSettings(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
  const whatsappNumber = (formData.get("whatsappNumber") as string) ?? "";
  const heroTitle = readLocalized(formData, "heroTitle");
  const heroSubtitle = readLocalized(formData, "heroSubtitle");
  const whatsappMessage = readLocalized(formData, "whatsappMessage");
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { whatsappNumber, heroTitle, heroSubtitle, whatsappMessage },
    create: { id: 1, whatsappNumber, heroTitle, heroSubtitle, whatsappMessage },
  });
  revalidatePath("/", "layout");
}
