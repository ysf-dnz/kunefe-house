import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/settings";
import { getFranchiseFaqs } from "@/lib/franchise";
import { type Locale } from "@/lib/i18n-field";
import { StatCounter } from "@/components/public/StatCounter";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { FranchiseForm } from "@/components/public/FranchiseForm";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({
    locale,
    path: "/bayilik",
    title: t("franchiseTitle"),
    description: t("franchiseDesc"),
  });
}

export default async function BayilikPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("franchise");
  const steps = [
    { n: "01", title: t("step1Title"), desc: t("step1Desc") },
    { n: "02", title: t("step2Title"), desc: t("step2Desc") },
    { n: "03", title: t("step3Title"), desc: t("step3Desc") },
  ];
  const [settings, faqs] = await Promise.all([getSiteSettings(), getFranchiseFaqs()]);
  if (settings?.showFranchise === false) notFound();
  const loc = locale as Locale;

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        <span className="relative rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold">
          {t("heroBadge")}
        </span>
        <h1 className="relative max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
          <span className="text-cream">{t("title1")}</span>
          <span className="text-gold-gradient">{t("titleHighlight")}</span>
          <span className="text-cream">{t("title2")}</span>
        </h1>
        <p className="relative max-w-xl text-cream/75">
          {t("heroDesc")}
        </p>
        <a href="#basvuru" className="btn-gold relative rounded-full px-8 py-3.5 text-sm font-semibold">
          {t("ctaApply")}
        </a>
      </section>

      {/* Tescil rozeti + rakamlar */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="card-premium mb-12 flex flex-col items-center gap-3 rounded-2xl p-6 text-center sm:flex-row sm:justify-center sm:gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-gold" aria-hidden="true">
              <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          </span>
          <p className="text-cream/90">
            <strong className="text-gold">{t("registered")}</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <StatCounter value={1000} suffix="+" label={t("statTargetBranches")} />
          <StatCounter value={100} suffix="%" label={t("statRegistered")} />
          <StatCounter value={3} label={t("statContinents")} />
          <StatCounter value={7} suffix="/24" label={t("statSupport")} />
        </div>
      </section>

      {/* Süreç adımları */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center font-serif text-3xl text-gold-gradient md:text-4xl">{t("howTitle")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card-premium rounded-2xl p-7">
              <div className="font-serif text-4xl text-gold/40">{s.n}</div>
              <h3 className="mt-3 font-serif text-xl text-gold">{s.title}</h3>
              <p className="mt-2 text-sm text-cream/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SSS */}
      {faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="mb-10 text-center font-serif text-3xl text-gold-gradient md:text-4xl">{t("faqTitle")}</h2>
          <FaqAccordion
            locale={loc}
            faqs={faqs.map((f) => ({
              id: f.id,
              question: f.question as Record<string, string> | null,
              answer: f.answer as Record<string, string> | null,
            }))}
          />
        </section>
      )}

      {/* Başvuru formu */}
      <section id="basvuru" className="mx-auto max-w-2xl px-6 py-16">
        <FranchiseForm whatsappNumber={settings?.whatsappNumber ?? null} />
      </section>
    </div>
  );
}
