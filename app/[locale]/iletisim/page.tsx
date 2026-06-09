import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings, getSocialLinks } from "@/lib/settings";
import { getBranches } from "@/lib/branches";
import { localize, type Locale } from "@/lib/i18n-field";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/iletisim",
    title: "İletişim",
    description: "Kunefe House ile iletişime geçin — WhatsApp, e-posta ve şubelerimiz.",
  });
}

export default async function IletisimPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const [settings, socials, branches] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
    getBranches(),
  ]);
  const loc = locale as Locale;
  const wa = settings?.whatsappNumber
    ? buildWhatsAppHref(settings.whatsappNumber, "Merhaba, bilgi almak istiyorum.")
    : null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-2 flex justify-center">
        <span className="text-xs uppercase tracking-[0.3em] text-copper">Bize Ulaşın</span>
      </div>
      <h1 className="text-center font-serif text-4xl text-gold-gradient md:text-5xl">{t("contact")}</h1>
      <div className="mx-auto mt-5 mb-14 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

      {/* Genel iletişim */}
      <div className="mx-auto mb-16 grid max-w-3xl gap-4 sm:grid-cols-3">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="card-premium rounded-2xl p-6 text-center">
            <p className="text-sm uppercase tracking-wider text-copper">WhatsApp</p>
            <p className="mt-2 font-serif text-lg text-gold">{settings?.whatsappNumber}</p>
          </a>
        )}
        {settings?.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="card-premium rounded-2xl p-6 text-center">
            <p className="text-sm uppercase tracking-wider text-copper">E-posta</p>
            <p className="mt-2 break-all font-serif text-lg text-gold">{settings.contactEmail}</p>
          </a>
        )}
        {socials.length > 0 && (
          <div className="card-premium rounded-2xl p-6 text-center">
            <p className="text-sm uppercase tracking-wider text-copper">Sosyal</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {socials.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="font-serif text-lg capitalize text-gold hover:text-gold-light">
                  {s.platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Şubeler */}
      {branches.length === 0 ? (
        <div className="card-premium rounded-2xl p-10 text-center">
          <p className="font-serif text-2xl text-gold-gradient">Şubelerimiz Yakında</p>
          <p className="mt-3 text-cream/70">
            Türkiye geneline ve ötesine yayılıyoruz. Bayilik için{" "}
            <a href="/bayilik" className="text-gold underline">başvurun</a>.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {branches.map((b) => (
            <div key={b.id} className="card-premium overflow-hidden rounded-2xl">
              {b.mapsEmbedUrl && (
                <iframe
                  src={b.mapsEmbedUrl}
                  className="h-56 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={b.name}
                />
              )}
              <div className="p-6">
                <h3 className="font-serif text-xl text-gold">{b.name}</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-cream/75">
                  {localize(b.address as Record<string, string> | null, loc)}
                </p>
                {b.workingHours && (
                  <p className="mt-2 text-sm text-cream/60">
                    {localize(b.workingHours as Record<string, string> | null, loc)}
                  </p>
                )}
                {b.phone && <p className="mt-2 text-sm text-gold">{b.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
