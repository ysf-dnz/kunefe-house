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

  const clamp = (v: FormDataEntryValue | null, max: number) =>
    (typeof v === "string" ? v : "").trim().slice(0, max);

  const name = clamp(formData.get("name"), 120);
  const phone = clamp(formData.get("phone"), 32);
  const city = clamp(formData.get("city"), 80);
  const budget = clamp(formData.get("budget"), 60) || null;
  const locationNote = clamp(formData.get("locationNote"), 1000) || null;

  if (!name || !phone || !city) {
    return { error: "İsim, telefon ve şehir zorunludur." };
  }
  // Telefon: en az 10 rakam içermeli (basit format doğrulaması)
  if ((phone.match(/\d/g)?.length ?? 0) < 10) {
    return { error: "Geçerli bir telefon numarası girin." };
  }
  if (formData.get("kvkk") !== "on") {
    return { error: "Devam etmek için KVKK onayı gereklidir." };
  }

  await prisma.franchiseApplication.create({
    data: { name, phone, city, budget, locationNote, status: "new" },
  });

  return { ok: true };
}
