import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-20 border-t border-copper/30 px-6 py-10 text-center text-sm text-cream/70">
      <p>© {new Date().getFullYear()} Kunefe House. {t("rights")}</p>
    </footer>
  );
}
