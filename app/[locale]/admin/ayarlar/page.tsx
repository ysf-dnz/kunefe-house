import { setRequestLocale } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireHQ } from "@/lib/require-admin";

export default async function AyarlarPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
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
        logoHeight: settings.logoHeight,
        contactEmail: settings.contactEmail,
        heroVideoUrl: settings.heroVideoUrl,
        heroOverlay: settings.heroOverlay,
        storyImageUrl: settings.storyImageUrl,
        storyTitle: settings.storyTitle as Record<string, string> | null,
        storyText: settings.storyText as Record<string, string> | null,
        privacyPolicy: settings.privacyPolicy as Record<string, string> | null,
        cookiePolicy: settings.cookiePolicy as Record<string, string> | null,
        cargoEnabled: settings.cargoEnabled,
        shippingFee: settings.shippingFee != null ? Number(settings.shippingFee) : null,
        freeShippingThreshold: settings.freeShippingThreshold != null ? Number(settings.freeShippingThreshold) : null,
        showEta: settings.showEta,
        showFranchise: settings.showFranchise,
        showReels: settings.showReels,
        showNews: settings.showNews,
        showStory: settings.showStory,
        showIngredients: settings.showIngredients,
        enabledLocales: settings.enabledLocales,
      } : null} />
    </div>
  );
}
