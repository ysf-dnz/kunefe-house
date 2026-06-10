import { getSiteSettings } from "@/lib/settings";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const settings = await getSiteSettings();
  return (
    <HeaderClient
      logoUrl={settings?.logoHeaderUrl ?? null}
      logoHeight={settings?.logoHeight ?? 60}
    />
  );
}
