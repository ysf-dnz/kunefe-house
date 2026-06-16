"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setBranch, setNearestBranch } from "@/app/[locale]/branch-actions";

type B = { id: string; name: string };
const FLAG = "kh_branch_prompted";

/** Tek modal: header butonları "kh:open-branch" olayıyla açar; ilk ziyarette (şube
 *  seçilmemiş + daha önce sorulmamış) otomatik açılır. Admin sayfalarında otomatik açılmaz. */
export function BranchModal({ branches, selectedId }: { branches: B[]; selectedId: string | null }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("kh:open-branch", onOpen);
    try {
      const isAdmin = pathname?.includes("/admin");
      if (!isAdmin && !selectedId && !localStorage.getItem(FLAG)) setOpen(true);
    } catch { /* yoksay */ }
    return () => window.removeEventListener("kh:open-branch", onOpen);
  }, [selectedId, pathname]);

  if (branches.length === 0) return null;

  const markPrompted = () => { try { localStorage.setItem(FLAG, "1"); } catch { /* yoksay */ } };
  const close = () => { markPrompted(); setOpen(false); };

  function choose(id: string | null) {
    setErr("");
    start(async () => { await setBranch(id); markPrompted(); setOpen(false); router.refresh(); });
  }
  function nearest() {
    setErr("");
    if (!navigator.geolocation) { setErr("Cihaz konum desteklemiyor"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        start(async () => {
          const name = await setNearestBranch(pos.coords.latitude, pos.coords.longitude);
          if (name) { markPrompted(); setOpen(false); router.refresh(); }
          else setErr("Yakında şube bulunamadı");
        }),
      () => setErr("Konum alınamadı — listeden seçebilirsin"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-forest-deep/80 p-4 backdrop-blur-sm" onClick={close}>
      <div className="card-premium w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-xl text-gold-gradient">Şubeni seç</h2>
        <p className="mt-1 mb-4 text-sm text-cream/70">Menü, fiyat ve teslimat seçtiğin şubeye göre gösterilir.</p>
        <button type="button" onClick={nearest} disabled={pending}
          className="btn-gold mb-3 w-full rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          📍 Bana en yakını bul
        </button>
        {err && <p className="mb-2 text-xs text-amber-400">{err}</p>}
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {branches.map((b) => (
            <button key={b.id} type="button" onClick={() => choose(b.id)} disabled={pending}
              className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gold/10 ${b.id === selectedId ? "text-gold" : "text-cream/80"}`}>
              🏪 {b.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={close}
          className="mt-4 w-full rounded-full border border-cream/25 px-4 py-2 text-sm text-cream/70 hover:text-cream">
          Şimdilik geç (merkezden göster)
        </button>
      </div>
    </div>
  );
}
