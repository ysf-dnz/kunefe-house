import { getActiveBranches, getSelectedBranch } from "@/lib/branch-select";
import { BranchModal } from "./BranchModal";

/** Şube seçim modalini tek noktadan mount eder (ilk ziyarette otomatik açılır). */
export async function BranchGate() {
  const [branches, selected] = await Promise.all([
    getActiveBranches().catch(() => []),
    getSelectedBranch().catch(() => null),
  ]);
  return (
    <BranchModal
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      selectedId={selected?.id ?? null}
    />
  );
}
