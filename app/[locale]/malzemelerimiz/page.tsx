import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { getMapPins } from "@/lib/mappins";
import { localize, type Locale } from "@/lib/i18n-field";
import { InteractiveMap } from "@/components/public/InteractiveMap";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/malzemelerimiz",
    title: "Malzemelerimiz",
    description: "Antep fıstığından Hatay peynirine — malzemelerimizin köklerini interaktif harita üzerinde keşfedin.",
  });
}

export default async function MalzemelerimizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const [settings, pins] = await Promise.all([getSiteSettings(), getMapPins()]);
  const loc = locale as Locale;

  const title = localize(settings?.mapTitle as Record<string, string> | null, loc) || t("ingredients");
  const description = localize(settings?.mapDescription as Record<string, string> | null, loc);

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-2 flex justify-center">
        <span className="text-xs uppercase tracking-[0.3em] text-copper">Topraktan Sofraya</span>
      </div>
      <h1 className="text-center font-serif text-4xl text-gold-gradient md:text-5xl">{title}</h1>
      <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      {description && (
        <p className="mx-auto mt-6 max-w-2xl text-center text-cream/75">{description}</p>
      )}

      <div className="mt-14">
        {settings?.mapImageUrl ? (
          <InteractiveMap
            mapImageUrl={settings.mapImageUrl}
            locale={loc}
            pins={pins.map((p) => ({
              id: p.id,
              cityName: p.cityName,
              x: p.x,
              y: p.y,
              ingredient: p.ingredient as Record<string, string> | null,
              popupTitle: p.popupTitle as Record<string, string> | null,
              popupBody: p.popupBody as Record<string, string> | null,
              popupMediaUrl: p.popupMediaUrl,
            }))}
          />
        ) : (
          <p className="text-center text-cream/50">Harita yakında.</p>
        )}
      </div>
    </section>
  );
}
