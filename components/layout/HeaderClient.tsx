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
      className={`glass-forest sticky top-0 z-40 flex items-center justify-between px-6 transition-all ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <Link href="/" className="font-serif text-xl tracking-wide text-cream">
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
            KUNEFE <span className="text-gold-gradient">HOUSE</span>
          </>
        )}
      </Link>
      <nav className="hidden gap-7 text-sm text-cream/90 md:flex">
        {[
          { href: "/", label: t("home") },
          { href: "/malzemelerimiz", label: t("ingredients") },
          { href: "/lezzetlerimiz", label: t("menu") },
          { href: "/bayilik", label: t("franchise") },
          { href: "/iletisim", label: t("contact") },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative transition-colors hover:text-gold"
          >
            {item.label}
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-gold to-copper transition-all duration-300 group-hover:w-full" />
          </Link>
        ))}
      </nav>
      <LanguageSwitcher />
    </header>
  );
}
