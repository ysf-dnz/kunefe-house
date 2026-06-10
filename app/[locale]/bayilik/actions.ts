"use server";

import { prisma } from "@/lib/prisma";

export type ApplicationState = { ok?: boolean; error?: string };

export async function submitApplication(
  _prev: ApplicationState,
  formData: FormData
): Promise<ApplicationState> {
  // Honeypot: bot bu gizli alanı doldurursa sessizce başarı dön (kaydetme)
  const honey = (formData.get("website") as string) || "";
  if (honey.trim()) return { ok: true };

  const name = ((formData.get("name") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const city = ((formData.get("city") as string) || "").trim();
  const budget = ((formData.get("budget") as string) || "").trim() || null;
  const locationNote = ((formData.get("locationNote") as string) || "").trim() || null;

  if (!name || !phone || !city) {
    return { error: "İsim, telefon ve şehir zorunludur." };
  }
  if (formData.get("kvkk") !== "on") {
    return { error: "Devam etmek için KVKK onayı gereklidir." };
  }

  await prisma.franchiseApplication.create({
    data: { name, phone, city, budget, locationNote, status: "new" },
  });

  return { ok: true };
}
