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
  const heroVideoUrl = (formData.get("heroVideoUrl") as string) || null;
  const heroOverlay = parseFloat((formData.get("heroOverlay") as string) || "0.5");
  const storyImageUrl = (formData.get("storyImageUrl") as string) || null;
  const storyTitle = readLocalized(formData, "storyTitle");
  const storyText = readLocalized(formData, "storyText");
  const data = {
    whatsappNumber, heroTitle, heroSubtitle, whatsappMessage, logoHeaderUrl, logoFooterUrl, contactEmail,
    heroVideoUrl, heroOverlay, storyImageUrl, storyTitle, storyText,
  };
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  // Public sayfalar dynamic render edildiği için ek invalidasyon gerekmez;
  // sonraki istekte taze okunur.
}
