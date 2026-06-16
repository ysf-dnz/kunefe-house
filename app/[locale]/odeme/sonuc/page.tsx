import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function SonucPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { locale } = await params;
  const { d } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const ok = d === "ok";
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className={`font-serif text-3xl ${ok ? "text-gold-gradient" : "text-red-400"}`}>
        {ok ? t("successTitle") : t("failTitle")}
      </h1>
      <p className="mt-4 text-cream/70">{ok ? t("successBody") : t("failBody")}</p>
      <Link href="/magaza" className="btn-gold mt-8 inline-block rounded-full px-6 py-3 text-sm font-semibold">
        {t("title")}
      </Link>
    </section>
  );
}
