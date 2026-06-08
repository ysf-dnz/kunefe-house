"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function HeaderClient({ logoUrl }: { logoUrl: string | null }) {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between px-6 transition-all bg-forest/95 backdrop-blur ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <Link href="/" className="font-serif text-xl text-cream">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Kunefe House"
            width={140}
            height={48}
            className={`w-auto transition-all ${scrolled ? "h-8" : "h-11"}`}
            priority
          />
        ) : (
          <>
            KUNEFE <span className="text-gold">HOUSE</span>
          </>
        )}
      </Link>
      <nav className="hidden gap-6 text-sm text-cream md:flex">
        <Link href="/">{t("home")}</Link>
        <Link href="/malzemelerimiz">{t("ingredients")}</Link>
        <Link href="/lezzetlerimiz">{t("menu")}</Link>
        <Link href="/bayilik">{t("franchise")}</Link>
        <Link href="/iletisim">{t("contact")}</Link>
      </nav>
      <LanguageSwitcher />
    </header>
  );
}
