import { getSiteSettings } from "@/lib/settings";
import { getActiveBranches, getSelectedBranch } from "@/lib/branch-select";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [settings, branches, selected] = await Promise.all([
    getSiteSettings(),
    getActiveBranches(),
    getSelectedBranch(),
  ]);
  // Etkin sunulan diller: varsayılan her zaman; EN/AR açıksa; TR yalnız varsayılan TR ise
  const enabled = settings?.enabledLocales ?? ["tr", "en", "ar"];
  const defaultLocale = settings?.defaultLocale ?? "tr";
  const servedLocales = ["tr", "en", "ar"].filter(
    (l) => l === defaultLocale || (l !== "tr" && enabled.includes(l))
  );

  return (
    <HeaderClient
      logoUrl={settings?.logoHeaderUrl ?? null}
      logoHeight={settings?.logoHeight ?? 60}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      selectedBranchId={selected?.id ?? null}
      cargoEnabled={!!settings?.cargoEnabled}
      showFranchise={settings?.showFranchise !== false}
      showIngredients={settings?.showIngredients !== false}
      enabledLocales={servedLocales}
    />
  );
}
