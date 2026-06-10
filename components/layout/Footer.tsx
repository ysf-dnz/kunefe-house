import { useTranslations } from "next-intl";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-24 px-6 py-12 text-center">
      <div className="gold-divider mx-auto mb-8 max-w-2xl" />
      <p className="font-serif text-lg tracking-wide text-cream">
        KUNEFE <span className="text-gold-gradient">HOUSE</span>
      </p>
      <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-cream/70">
        <Link href="/lezzetlerimiz" className="hover:text-gold">Lezzetlerimiz</Link>
        <Link href="/bayilik" className="hover:text-gold">Bayilik</Link>
        <Link href="/iletisim" className="hover:text-gold">İletişim</Link>
        <Link href="/gizlilik" className="hover:text-gold">Gizlilik &amp; KVKK</Link>
        <Link href="/cerez-politikasi" className="hover:text-gold">Çerez Politikası</Link>
      </nav>
      <p className="mt-5 text-sm text-cream/50">
        © {new Date().getFullYear()} Kunefe House. {t("rights")}
      </p>
    </footer>
  );
}
