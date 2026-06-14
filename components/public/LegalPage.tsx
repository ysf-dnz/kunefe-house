import { getTranslations } from "next-intl/server";

export async function LegalPage({ title, content }: { title: string; content: string }) {
  const t = await getTranslations("legal");
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-serif text-4xl text-gold-gradient md:text-5xl">{title}</h1>
      <div className="mt-5 mb-10 h-px w-24 bg-gradient-to-r from-gold to-transparent" />
      <div className="whitespace-pre-line leading-relaxed text-cream/80">
        {content || t("contentSoon")}
      </div>
    </section>
  );
}
