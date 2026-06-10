import { localize, type Locale } from "@/lib/i18n-field";
import { getSiteSettings } from "@/lib/settings";
import { getLocale, getTranslations } from "next-intl/server";
import { buildWhatsAppHref } from "@/lib/whatsapp";

export async function WhatsAppButton() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("whatsapp");
  const settings = await getSiteSettings();
  const number = settings?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const message = localize(settings?.whatsappMessage as Record<Locale, string> | null, locale) || t("message");
  const href = buildWhatsAppHref(number, message);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t("label")}
      className="fixed bottom-6 end-6 z-50 transition-transform hover:scale-110">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fistik.svg"
        alt={t("label")}
        className="h-16 w-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
      />
    </a>
  );
}
