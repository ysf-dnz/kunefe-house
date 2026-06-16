import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CartView } from "@/components/shop/CartView";
import { getShippingConfig, isCargoEnabled } from "@/lib/cargo-catalog";

export default async function SepetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isCargoEnabled())) notFound();
  const t = await getTranslations("cart");
  const shipping = await getShippingConfig();
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-8 text-center font-serif text-3xl text-gold-gradient">{t("title")}</h1>
      <CartView shipping={shipping} />
    </section>
  );
}
