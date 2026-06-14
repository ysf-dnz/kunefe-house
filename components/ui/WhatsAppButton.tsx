import { type Locale } from "@/lib/i18n-field";
import { getSiteSettings } from "@/lib/settings";
import { getLocale, getTranslations } from "next-intl/server";
import { EtaButton } from "./EtaButton";

export async function WhatsAppButton() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("whatsapp");
  const settings = await getSiteSettings().catch(() => null);
  const number = settings?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  if (!number) return null;
  return <EtaButton number={number} locale={locale} label={t("label")} />;
}
