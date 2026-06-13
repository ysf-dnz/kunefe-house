"use client";

import { useState } from "react";
import type { Portion } from "@/lib/portions";

type Row = { persons: string; price: string; oldPrice: string };

function toRows(portions: Portion[] | null | undefined): Row[] {
  if (!portions || portions.length === 0) return [];
  return portions.map((p) => ({
    persons: String(p.persons),
    price: String(p.price),
    oldPrice: p.oldPrice != null ? String(p.oldPrice) : "",
  }));
}

export function PortionEditor({ name, defaultValue }: { name: string; defaultValue?: Portion[] | null }) {
  const [rows, setRows] = useState<Row[]>(toRows(defaultValue));

  function update(i: number, key: keyof Row, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { persons: "", price: "", oldPrice: "" }]);
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
      }))
      .filter((p) => Number.isFinite(p.persons) && p.persons > 0 && Number.isFinite(p.price))
  );

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={serialized} />
      <span className="text-xs text-cream/50">
        Porsiyon eklersen müşteri detayda kişi sayısı seçer; boş bırakırsan yukarıdaki tekil fiyat geçerli olur.
      </span>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-cream/70">
            Kişi
            <input type="number" min="1" value={r.persons} onChange={(e) => update(i, "persons", e.target.value)}
              className="rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" placeholder="4" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream/70">
            Fiyat ₺
            <input type="number" min="0" step="0.01" value={r.price} onChange={(e) => update(i, "price", e.target.value)}
              className="rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" placeholder="320" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream/70">
            Eski ₺ (ops.)
            <input type="number" min="0" step="0.01" value={r.oldPrice} onChange={(e) => update(i, "oldPrice", e.target.value)}
              className="rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" placeholder="380" />
          </label>
          <button type="button" onClick={() => removeRow(i)}
            className="mb-0.5 rounded border border-red-400/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10">
            Sil
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow}
        className="self-start rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold hover:bg-gold/10">
        + Porsiyon ekle
      </button>
    </div>
  );
}
