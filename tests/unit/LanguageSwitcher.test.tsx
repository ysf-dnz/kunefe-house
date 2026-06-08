import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next-intl", () => ({ useLocale: () => "tr" }));

describe("LanguageSwitcher", () => {
  it("üç dil seçeneği gösterir", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("TR")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("AR")).toBeInTheDocument();
  });
});
