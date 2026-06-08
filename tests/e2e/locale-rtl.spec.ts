import { test, expect } from "@playwright/test";

test("Arapça sayfa dir=rtl olur", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("Türkçe sayfa dir=ltr olur", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("WhatsApp butonu görünür", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.getByRole("link", { name: /whatsapp/i })).toBeVisible();
});
