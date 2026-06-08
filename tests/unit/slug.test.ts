import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("Türkçe karakterleri sadeleştirir", () => { expect(slugify("Fıstıklı Künefe")).toBe("fistikli-kunefe"); });
  it("boşluk ve sembolleri tireye çevirir", () => { expect(slugify("Çikolatalı  Künefe!")).toBe("cikolatali-kunefe"); });
  it("baş/son tireleri kırpar", () => { expect(slugify("  Spesiyal  ")).toBe("spesiyal"); });
});
