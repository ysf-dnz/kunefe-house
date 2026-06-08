"use server";

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
  const logoHeaderUrl = (formData.get("logoHeaderUrl") as string) || null;
  const logoFooterUrl = (formData.get("logoFooterUrl") as string) || null;
  const contactEmail = (formData.get("contactEmail") as string) || null;
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { whatsappNumber, heroTitle, heroSubtitle, whatsappMessage, logoHeaderUrl, logoFooterUrl, contactEmail },
    create: { id: 1, whatsappNumber, heroTitle, heroSubtitle, whatsappMessage, logoHeaderUrl, logoFooterUrl, contactEmail },
  });
  // Public sayfalar dynamic render edildiği için ek invalidasyon gerekmez;
  // sonraki istekte taze okunur.
}
