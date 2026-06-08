import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-24 px-6 py-12 text-center">
      <div className="gold-divider mx-auto mb-8 max-w-2xl" />
      <p className="font-serif text-lg tracking-wide text-cream">
        KUNEFE <span className="text-gold-gradient">HOUSE</span>
      </p>
      <p className="mt-3 text-sm text-cream/60">
        © {new Date().getFullYear()} Kunefe House. {t("rights")}
      </p>
    </footer>
  );
}
