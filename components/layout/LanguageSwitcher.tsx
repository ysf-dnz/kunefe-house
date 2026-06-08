"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const LOCALES = ["tr", "en", "ar"] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: string) {
    const segments = pathname.split("/");
    if (LOCALES.includes(segments[1] as (typeof LOCALES)[number])) {
      segments[1] = target;
    } else {
      segments.splice(1, 0, target);
    }
    router.replace(segments.join("/") || "/");
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
