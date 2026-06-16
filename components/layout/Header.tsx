import { getSiteSettings } from "@/lib/settings";
import { getActiveBranches, getSelectedBranch } from "@/lib/branch-select";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [settings, branches, selected] = await Promise.all([
    getSiteSettings(),
    getActiveBranches(),
    getSelectedBranch(),
  ]);
  return (
    <HeaderClient
      logoUrl={settings?.logoHeaderUrl ?? null}
      logoHeight={settings?.logoHeight ?? 60}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      selectedBranchId={selected?.id ?? null}
      cargoEnabled={!!settings?.cargoEnabled}
      showFranchise={settings?.showFranchise !== false}
      showIngredients={settings?.showIngredients !== false}
      enabledLocales={settings?.enabledLocales ?? ["tr", "en", "ar"]}
    />
  );
}
