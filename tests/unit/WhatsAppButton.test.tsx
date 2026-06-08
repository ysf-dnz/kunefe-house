import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "message" ? "Merhaba" : "WhatsApp",
}));

describe("WhatsAppButton", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "905555555555";
  });

  it("doğru wa.me linkini oluşturur", () => {
    render(<WhatsAppButton />);
    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/905555555555")
    );
  });
});
