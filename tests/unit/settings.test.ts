import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, findMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { siteSettings: { findUnique }, socialLink: { findMany } },
}));

import { getSiteSettings, getSocialLinks } from "@/lib/settings";

describe("getSiteSettings", () => {
  beforeEach(() => { findUnique.mockReset(); findMany.mockReset(); });
  it("id=1 singleton'ı okur", async () => {
    findUnique.mockResolvedValue({ id: 1, whatsappNumber: "905" });
    const s = await getSiteSettings();
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(s?.whatsappNumber).toBe("905");
  });
  it("sosyal linkleri sıraya göre döner", async () => {
    findMany.mockResolvedValue([{ id: "instagram", platform: "instagram", url: "x", order: 0 }]);
    const links = await getSocialLinks();
    expect(findMany).toHaveBeenCalledWith({ orderBy: { order: "asc" } });
    expect(links).toHaveLength(1);
  });
});
