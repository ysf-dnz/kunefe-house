import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { branchScope } from "@/lib/require-admin";

describe("branchScope", () => {
  it("HQ için undefined (tüm şubeler)", () => {
    expect(branchScope({ id: "u1", email: "a@x.co", role: "HQ_ADMIN", branchId: null })).toBeUndefined();
  });
  it("şube yöneticisi için kendi branchId", () => {
    expect(branchScope({ id: "u2", email: "b@x.co", role: "BRANCH_ADMIN", branchId: "b1" })).toBe("b1");
  });
  it("branchId'siz şube yöneticisi hiçbir şeyle eşleşmez", () => {
    expect(branchScope({ id: "u3", email: "c@x.co", role: "BRANCH_ADMIN", branchId: null })).toBe("__none__");
  });
});
