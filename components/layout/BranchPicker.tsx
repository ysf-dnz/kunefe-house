"use client";

type B = { id: string; name: string };

/** Header'daki tetikleyici buton — şube seçim modalini açar (modal: BranchModal). */
export function BranchPicker({ branches, selectedId }: { branches: B[]; selectedId: string | null }) {
  if (branches.length === 0) return null;
  const selected = branches.find((b) => b.id === selectedId);
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("kh:open-branch"))}
      className="flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold hover:bg-gold/10">
      🏪 {selected ? selected.name : "Şube seç"}
    </button>
  );
}
