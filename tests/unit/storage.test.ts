import { describe, it, expect } from "vitest";
import { buildStoragePath, publicUrlFor } from "@/lib/storage";

describe("buildStoragePath", () => {
  it("klasör + benzersiz dosya adı üretir (uzantı korunur)", () => {
    const p = buildStoragePath("products", "Künefe Resmi.JPG");
    expect(p).toMatch(/^products\/[0-9a-f-]+\.jpg$/);
  });
  it("uzantı yoksa bin varsayar", () => {
    const p = buildStoragePath("logos", "logo");
    expect(p).toMatch(/^logos\/[0-9a-f-]+\.bin$/);
  });
});
describe("publicUrlFor", () => {
  it("bucket public URL'i kurar", () => {
    const url = publicUrlFor("https://abc.supabase.co", "media", "products/x.jpg");
    expect(url).toBe("https://abc.supabase.co/storage/v1/object/public/media/products/x.jpg");
  });
});
