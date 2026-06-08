"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { LocalizedInput } from "./LocalizedInput";
import { ImageUpload } from "./ImageUpload";
import { createPin } from "@/app/[locale]/admin/harita/actions";

type Pin = { id: string; cityName: string; x: number; y: number };

export function MapEditor({ mapImageUrl, pins }: { mapImageUrl: string | null; pins: Pin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  if (!mapImageUrl) {
    return <p className="text-cream/60">Önce yukarıdan harita görselini yükleyin, sonra pin ekleyebilirsiniz.</p>;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Tıklanabilir harita */}
      <div className="flex-1">
        <p className="mb-2 text-sm text-cream/70">Pin konumu için haritaya tıklayın:</p>
        <div ref={ref} onClick={onClick}
          className="relative aspect-[4/3] w-full cursor-crosshair overflow-hidden rounded-xl border border-copper/30">
          <Image src={mapImageUrl} alt="Harita" fill className="object-contain" />
          {pins.map((p) => (
            <span key={p.id}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper ring-2 ring-cream/50"
              style={{ left: `${p.x}%`, top: `${p.y}%` }} title={p.cityName} />
          ))}
          {pos && (
            <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gold ring-2 ring-cream"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }} />
          )}
        </div>
      </div>

      {/* Yeni pin formu */}
      <form action={createPin} className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-forest-light p-5">
        <h3 className="font-serif text-gold">Yeni Pin</h3>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-cream/70">X (%)</label>
            <input name="x" required value={pos?.x ?? ""} readOnly placeholder="haritaya tıkla"
              className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-cream/70">Y (%)</label>
            <input name="y" required value={pos?.y ?? ""} readOnly placeholder="haritaya tıkla"
              className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-cream/80">Şehir</label>
          <input name="cityName" placeholder="Gaziantep"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <LocalizedInput name="ingredient" label="Malzeme" />
        <LocalizedInput name="popupTitle" label="Popup Başlık" />
        <LocalizedInput name="popupBody" label="Popup Açıklama" multiline />
        <ImageUpload name="popupMediaUrl" label="Popup Görseli" folder="map" />
        <button className="btn-gold self-start rounded-full px-6 py-2 text-sm font-semibold">Pin Ekle</button>
      </form>
    </div>
  );
}
