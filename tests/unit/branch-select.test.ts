import { describe, it, expect } from "vitest";
import { nearestBranch } from "@/lib/branch-select";

const branches = [
  { id: "ist", name: "İstanbul", lat: 41.01, lng: 28.97 },
  { id: "ank", name: "Ankara", lat: 39.93, lng: 32.85 },
  { id: "nocoord", name: "Koordinatsız", lat: null, lng: null },
];

describe("nearestBranch", () => {
  it("en yakın şubeyi döner", () => {
    expect(nearestBranch(41.0, 29.0, branches)?.id).toBe("ist");
    expect(nearestBranch(39.9, 32.8, branches)?.id).toBe("ank");
  });
  it("koordinatsız şubeleri atlar", () => {
    expect(nearestBranch(41.0, 29.0, [{ id: "x", name: "X", lat: null, lng: null }])).toBeNull();
  });
  it("aday yoksa null", () => {
    expect(nearestBranch(0, 0, [])).toBeNull();
  });
});
