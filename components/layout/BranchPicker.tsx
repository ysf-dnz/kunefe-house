"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBranch, setNearestBranch } from "@/app/[locale]/branch-actions";

type B = { id: string; name: string };

export function BranchPicker({ branches, selectedId }: { branches: B[]; selectedId: string | null }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (branches.length === 0) return null;

  const selected = branches.find((b) => b.id === selectedId);

  function choose(id: string | null) {
    setErr("");
    start(async () => { await setBranch(id); setOpen(false); router.refresh(); });
  }
  function nearest() {
    setErr("");
    if (!navigator.geolocation) { setErr("Cihaz konum desteklemiyor"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        start(async () => {
          const name = await setNearestBranch(pos.coords.latitude, pos.coords.longitude);
          if (name) { setOpen(false); router.refresh(); }
          else setErr("Yakında şube bulunamadı");
        });
      },
      () => setErr("Konum alınamadı — listeden seçebilirsin"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} disabled={pending}
        className="flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10">
        🏪 {selected ? selected.name : "Şube seç"}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-copper/30 bg-forest-light p-2 shadow-xl">
          <button type="button" onClick={nearest}
            className="mb-1 w-full rounded px-3 py-2 text-left text-sm text-gold hover:bg-gold/10">📍 Bana en yakını</button>
          {err && <p className="px-3 pb-1 text-xs text-amber-400">{err}</p>}
          <button type="button" onClick={() => choose(null)}
            className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gold/10 ${!selectedId ? "text-gold" : "text-cream/80"}`}>Genel (merkez)</button>
          {branches.map((b) => (
            <button key={b.id} type="button" onClick={() => choose(b.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gold/10 ${b.id === selectedId ? "text-gold" : "text-cream/80"}`}>{b.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
