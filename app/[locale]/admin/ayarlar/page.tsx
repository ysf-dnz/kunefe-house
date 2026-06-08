import { setRequestLocale } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/require-admin";

export default async function AyarlarPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSiteSettings();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Site Ayarları</h1>
      <SettingsForm settings={settings ? {
        whatsappNumber: settings.whatsappNumber,
        heroTitle: settings.heroTitle as Record<string, string> | null,
        heroSubtitle: settings.heroSubtitle as Record<string, string> | null,
        whatsappMessage: settings.whatsappMessage as Record<string, string> | null,
        logoHeaderUrl: settings.logoHeaderUrl,
        logoFooterUrl: settings.logoFooterUrl,
      } : null} />
    </div>
  );
}
