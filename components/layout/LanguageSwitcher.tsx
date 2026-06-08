"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = ["tr", "en", "ar"] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: (typeof LOCALES)[number]) {
    router.replace(pathname, { locale: target });
  }

  return (
    <div className="flex gap-2 text-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={l === locale ? "font-bold text-gold" : "text-cream"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
