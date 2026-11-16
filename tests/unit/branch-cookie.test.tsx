import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { readBranchCookie, BRANCH_COOKIE } from "@/lib/branch-cookie";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/app/[locale]/branch-actions", () => ({
  setBranch: vi.fn(async () => {}),
  setNearestBranch: vi.fn(async () => null),
}));

import { BranchPicker } from "@/components/layout/BranchPicker";
import { BranchModal } from "@/components/layout/BranchModal";
import { notifyBranchChange } from "@/components/layout/useSelectedBranchId";

const branches = [
  { id: "br_kayseri", name: "Kayseri Merkez" },
  { id: "br_ankara", name: "Ankara Çankaya" },
];

function setCookie(v: string | null) {
  document.cookie = v === null
    ? `${BRANCH_COOKIE}=; path=/; max-age=0`
    : `${BRANCH_COOKIE}=${encodeURIComponent(v)}; path=/`;
}

describe("readBranchCookie", () => {
  it("çerez metninden kh_branch değerini okur", () => {
    expect(readBranchCookie("a=1; kh_branch=br_1; b=2")).toBe("br_1");
    expect(readBranchCookie("kh_branch=br_1")).toBe("br_1");
  });
  it("benzer adlı çerezle karışmaz (kh_branch_prompted vb.)", () => {
    expect(readBranchCookie("kh_branch_prompted=1; xkh_branch=2")).toBeNull();
  });
  it("yoksa veya boşsa null", () => {
    expect(readBranchCookie("")).toBeNull();
    expect(readBranchCookie(undefined)).toBeNull();
    expect(readBranchCookie("kh_branch=")).toBeNull();
  });
  it("URL kodlu değeri çözer", () => {
    expect(readBranchCookie("kh_branch=a%20b")).toBe("a b");
  });
});

describe("BranchPicker (istemcide çerezden okur)", () => {
  beforeEach(() => setCookie(null));
  afterEach(() => cleanup());

  it("çerez yoksa 'Şube seç' gösterir", () => {
    render(<BranchPicker branches={branches} />);
    expect(screen.getByRole("button").textContent).toContain("Şube seç");
  });

  it("çerezdeki şubenin adını gösterir", () => {
    setCookie("br_ankara");
    render(<BranchPicker branches={branches} />);
    expect(screen.getByRole("button").textContent).toContain("Ankara Çankaya");
  });

  it("pasif/bilinmeyen şube id'sinde 'Şube seç' gösterir", () => {
    setCookie("br_pasif");
    render(<BranchPicker branches={branches} />);
    expect(screen.getByRole("button").textContent).toContain("Şube seç");
  });

  it("seçim olayıyla yeniden okur", () => {
    render(<BranchPicker branches={branches} />);
    setCookie("br_kayseri");
    act(() => notifyBranchChange());
    expect(screen.getByRole("button").textContent).toContain("Kayseri Merkez");
  });
});

describe("BranchModal ilk ziyaret", () => {
  beforeEach(() => { setCookie(null); localStorage.clear(); });
  afterEach(() => cleanup());

  it("şube seçilmemiş ve sorulmamışsa otomatik açılır", () => {
    render(<BranchModal branches={branches} />);
    expect(screen.getByText("Şubeni seç")).toBeTruthy();
  });

  it("geçerli şube çerezi varsa açılmaz", () => {
    setCookie("br_kayseri");
    render(<BranchModal branches={branches} />);
    expect(screen.queryByText("Şubeni seç")).toBeNull();
  });

  it("daha önce sorulduysa açılmaz", () => {
    localStorage.setItem("kh_branch_prompted", "1");
    render(<BranchModal branches={branches} />);
    expect(screen.queryByText("Şubeni seç")).toBeNull();
  });

  it("çerezdeki şube artık aktif değilse yeniden sorar", () => {
    setCookie("br_pasif");
    render(<BranchModal branches={branches} />);
    expect(screen.getByText("Şubeni seç")).toBeTruthy();
  });
});
