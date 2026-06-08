"use client";

import { useState } from "react";

const LOCALES = ["tr", "en", "ar"] as const;
type Loc = (typeof LOCALES)[number];

export function LocalizedInput({
  name, label, defaultValue, multiline = false,
}: {
  name: string;
  label: string;
  defaultValue?: Partial<Record<Loc, string>> | null;
  multiline?: boolean;
}) {
  const [active, setActive] = useState<Loc>("tr");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-cream/80">{label}</label>
        <div className="flex gap-1">
          {LOCALES.map((l) => (
            <button key={l} type="button" onClick={() => setActive(l)}
              className={`rounded px-2 py-0.5 text-xs ${l === active ? "bg-gold text-forest" : "bg-forest text-cream/60"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {LOCALES.map((l) =>
        multiline ? (
          <textarea key={l} name={`${name}.${l}`} defaultValue={defaultValue?.[l] ?? ""}
            dir={l === "ar" ? "rtl" : "ltr"} rows={4}
            className={`${l === active ? "block" : "hidden"} rounded border border-copper/40 bg-forest px-3 py-2 text-cream`} />
        ) : (
          <input key={l} name={`${name}.${l}`} defaultValue={defaultValue?.[l] ?? ""}
            dir={l === "ar" ? "rtl" : "ltr"}
            className={`${l === active ? "block" : "hidden"} rounded border border-copper/40 bg-forest px-3 py-2 text-cream`} />
        )
      )}
    </div>
  );
}
