import { getActiveBranches } from "@/lib/branch-select";
import { BranchModal } from "./BranchModal";

/** Şube seçim modalini tek noktadan mount eder (ilk ziyarette otomatik açılır).
 *  Çerez okumaz (ISR): seçili şubeyi BranchModal istemcide kh_branch'ten okur.
 *  DB hatası yutulmaz; bkz. Header.tsx. */
export async function BranchGate() {
  const branches = await getActiveBranches();
  return <BranchModal branches={branches.map((b) => ({ id: b.id, name: b.name }))} />;
}
