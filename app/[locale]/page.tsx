import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { getFeaturedProducts } from "@/lib/products";
import { getReels } from "@/lib/reels";
import { localize, type Locale } from "@/lib/i18n-field";
import { Hero } from "@/components/public/Hero";
import { BrandStory } from "@/components/public/BrandStory";
import { FeaturedSlider } from "@/components/public/FeaturedSlider";
import { ReelsStrip } from "@/components/public/ReelsStrip";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const tn = await getTranslations("nav");
  const [settings, featured, reels] = await Promise.all([getSiteSettings(), getFeaturedProducts(), getReels()]);
  const loc = locale as Locale;
  const title = localize(settings?.heroTitle as Record<Locale, string> | null, loc) || t("title");
  const storyTitle = localize(settings?.storyTitle as Record<Locale, string> | null, loc);
  const storyText = localize(settings?.storyText as Record<Locale, string> | null, loc);

  return (
    <>
      <Hero
        videoUrl={settings?.heroVideoUrl ?? null}
        overlay={settings?.heroOverlay ?? 0.5}
        badge="Tescilli Premium Künefe"
        title={title}
        discoverLabel={t("discover")}
        franchiseLabel={t("franchise")}
      />

      {(storyTitle || settings?.storyImageUrl) && (
        <BrandStory imageUrl={settings?.storyImageUrl ?? null} title={storyTitle} text={storyText} />
      )}

      <FeaturedSlider
        items={featured.map((p) => ({ id: p.id, slug: p.slug, title: p.title as Record<string, string> | null, primaryImageUrl: p.primaryImageUrl }))}
        locale={loc}
        heading={tn("menu")}
      />

      <ReelsStrip
        reels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl, videoUrl: r.videoUrl, instagramUrl: r.instagramUrl }))}
        locale={loc}
        heading="Mutfaktan Kareler"
      />
    </>
  );
}
