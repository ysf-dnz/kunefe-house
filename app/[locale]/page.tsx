import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations("hero");
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="font-serif text-4xl md:text-6xl text-cream max-w-3xl">
        {t("title")}
      </h1>
      <div className="flex gap-4">
        <Link href="#" className="rounded bg-gold px-6 py-3 font-medium text-forest">
          {t("discover")}
        </Link>
        <Link href="#" className="rounded border border-copper px-6 py-3 font-medium text-cream">
          {t("franchise")}
        </Link>
      </div>
    </section>
  );
}
