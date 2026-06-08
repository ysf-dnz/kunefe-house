import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const replace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/malzemelerimiz",
  useRouter: () => ({ replace }),
}));
vi.mock("next-intl", () => ({ useLocale: () => "tr" }));

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("üç dil seçeneği gösterir", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("TR")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
  });

  it("İngilizce'ye geçince mevcut pathname'i locale ile değiştirir", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("EN"));
    expect(replace).toHaveBeenCalledWith("/malzemelerimiz", { locale: "en" });
  });

  it("varsayılan dile (tr) geçince de next-intl'e delege eder (ham /tr öneki üretmez)", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("TR"));
    expect(replace).toHaveBeenCalledWith("/malzemelerimiz", { locale: "tr" });
  });
});
