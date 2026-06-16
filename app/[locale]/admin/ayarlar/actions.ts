"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export type SaveState = { ok?: boolean; error?: string };

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function updateSettings(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try { await requireHQ(); } catch { return { error: "Yetkisiz" }; }
  const whatsappNumber = (formData.get("whatsappNumber") as string) ?? "";
  const heroTitle = readLocalized(formData, "heroTitle");
  const heroSubtitle = readLocalized(formData, "heroSubtitle");
  const whatsappMessage = readLocalized(formData, "whatsappMessage");
  const logoHeaderUrl = (formData.get("logoHeaderUrl") as string) || null;
  const logoHeight = Math.min(120, Math.max(32, parseInt((formData.get("logoHeight") as string) || "60", 10) || 60));
  const contactEmail = (formData.get("contactEmail") as string) || null;
  const heroVideoUrl = (formData.get("heroVideoUrl") as string) || null;
  const heroOverlay = parseFloat((formData.get("heroOverlay") as string) || "0.5");
  const storyImageUrl = (formData.get("storyImageUrl") as string) || null;
  const storyTitle = readLocalized(formData, "storyTitle");
  const storyText = readLocalized(formData, "storyText");
  const privacyPolicy = readLocalized(formData, "privacyPolicy");
  const cookiePolicy = readLocalized(formData, "cookiePolicy");
  const showEta = formData.get("showEta") === "on";
  const showFranchise = formData.get("showFranchise") === "on";
  const showReels = formData.get("showReels") === "on";
  const showNews = formData.get("showNews") === "on";
  const showStory = formData.get("showStory") === "on";
  const showIngredients = formData.get("showIngredients") === "on";
  // TR her zaman açık; EN/AR opsiyonel
  const enabledLocales = ["tr",
    ...(formData.get("locale_en") === "on" ? ["en"] : []),
    ...(formData.get("locale_ar") === "on" ? ["ar"] : []),
  ];
  const cargoEnabled = formData.get("cargoEnabled") === "on";
  const parseMoney = (name: string): number | null => {
    const raw = ((formData.get(name) as string) ?? "").trim().replace(",", ".");
    const n = Number(raw);
    return raw && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  };
  const shippingFee = parseMoney("shippingFee");
  const freeShippingThreshold = parseMoney("freeShippingThreshold");
  const data = {
    whatsappNumber, heroTitle, heroSubtitle, whatsappMessage, logoHeaderUrl, logoHeight, contactEmail,
    heroVideoUrl, heroOverlay, storyImageUrl, storyTitle, storyText, privacyPolicy, cookiePolicy,
    cargoEnabled, shippingFee, freeShippingThreshold,
    showEta, showFranchise, showReels, showNews, showStory, showIngredients, enabledLocales,
  };
  try {
    await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
  } catch {
    return { error: "Kaydedilemedi, tekrar deneyin." };
  }
  // Public sayfaları (logo/hero header'da) anında tazele
  revalidatePath("/", "layout");
  return { ok: true };
}
