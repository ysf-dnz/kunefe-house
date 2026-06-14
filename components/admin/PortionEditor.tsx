"use client";

import { useState } from "react";
import type { Portion } from "@/lib/portions";

type Row = {
  persons: string; price: string; oldPrice: string;
  usd: string; oldUsd: string; qar: string; oldQar: string;
};

function toRows(portions: Portion[] | null | undefined): Row[] {
  if (!portions || portions.length === 0) return [];
  return portions.map((p) => ({
    persons: String(p.persons),
    price: String(p.price),
    oldPrice: p.oldPrice != null ? String(p.oldPrice) : "",
    usd: p.usd != null ? String(p.usd) : "",
    oldUsd: p.oldUsd != null ? String(p.oldUsd) : "",
    qar: p.qar != null ? String(p.qar) : "",
    oldQar: p.oldQar != null ? String(p.oldQar) : "",
  }));
}

const num = (s: string) => (s.trim() ? Number(s) : undefined);

export function PortionEditor({ name, defaultValue }: { name: string; defaultValue?: Portion[] | null }) {
  const [rows, setRows] = useState<Row[]>(toRows(defaultValue));

  function update(i: number, key: keyof Row, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { persons: "", price: "", oldPrice: "", usd: "", oldUsd: "", qar: "", oldQar: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  const serialized = JSON.stringify(
    rows
      .map((r) => ({
        persons: Number(r.persons),
        price: Number(r.price),
        ...(r.oldPrice.trim() ? { oldPrice: Number(r.oldPrice) } : {}),
        ...(num(r.usd) !== undefined ? { usd: num(r.usd) } : {}),
        ...(num(r.oldUsd) !== undefined ? { oldUsd: num(r.oldUsd) } : {}),
        ...(num(r.qar) !== undefined ? { qar: num(r.qar) } : {}),
        ...(num(r.oldQar) !== undefined ? { oldQar: num(r.oldQar) } : {}),
      }))
      .filter((p) => Number.isFinite(p.persons) && p.persons > 0 && Number.isFinite(p.price))
  );

  const cell = "rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream";

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={serialized} />
      <span className="text-xs text-cream/50">
        Her porsiyona ₺ (zorunlu) + opsiyonel $ ve ر.ق fiyatı gir. Bir para birimi boşsa o dilde fiyat gösterilmez.
      </span>
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-copper/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <label className="text-xs text-cream/70">Kişi</label>
            <input type="number" min="1" value={r.persons} onChange={(e) => update(i, "persons", e.target.value)}
              className={`${cell} w-20`} placeholder="4" />
            <button type="button" onClick={() => removeRow(i)}
              className="ms-auto rounded border border-red-400/50 px-3 py-1 text-xs text-red-400 hover:bg-red-400/10">Sil</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-cream/70">₺ fiyat
              <input type="number" min="0" step="0.01" value={r.price} onChange={(e) => update(i, "price", e.target.value)} className={cell} placeholder="320" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/70">$ fiyat
              <input type="number" min="0" step="0.01" value={r.usd} onChange={(e) => update(i, "usd", e.target.value)} className={cell} placeholder="10" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/70">ر.ق fiyat
              <input type="number" min="0" step="0.01" value={r.qar} onChange={(e) => update(i, "qar", e.target.value)} className={cell} placeholder="36" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/50">₺ eski
              <input type="number" min="0" step="0.01" value={r.oldPrice} onChange={(e) => update(i, "oldPrice", e.target.value)} className={cell} placeholder="380" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/50">$ eski
              <input type="number" min="0" step="0.01" value={r.oldUsd} onChange={(e) => update(i, "oldUsd", e.target.value)} className={cell} placeholder="12" /></label>
            <label className="flex flex-col gap-1 text-xs text-cream/50">ر.ق eski
              <input type="number" min="0" step="0.01" value={r.oldQar} onChange={(e) => update(i, "oldQar", e.target.value)} className={cell} placeholder="40" /></label>
          </div>
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="self-start rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold hover:bg-gold/10">+ Porsiyon ekle</button>
    </div>
  );
}
