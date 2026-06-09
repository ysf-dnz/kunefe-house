"use client";

import Image from "next/image";
import { useState } from "react";
import { removeMedia } from "@/app/[locale]/admin/medya/actions";

type Item = { path: string; url: string; folder: string; name: string; isVideo: boolean };

export function MediaGrid({ items }: { items: Item[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  if (items.length === 0) return <p className="text-cream/60">Henüz medya yok.</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.path} className="card-premium overflow-hidden rounded-xl">
          <div className="relative aspect-square bg-forest">
            {it.isVideo ? (
              <video src={it.url} className="h-full w-full object-cover" muted />
            ) : (
              <Image src={it.url} alt={it.name} fill className="object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-1 p-2">
            <span className="truncate text-[11px] text-cream/50">{it.folder}</span>
            <div className="flex gap-2">
              <button onClick={() => copy(it.url)} className="text-xs text-gold">
                {copied === it.url ? "Kopyalandı ✓" : "URL kopyala"}
              </button>
              <form action={removeMedia} className="ml-auto">
                <input type="hidden" name="path" value={it.path} />
                <button className="text-xs text-red-400">Sil</button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
