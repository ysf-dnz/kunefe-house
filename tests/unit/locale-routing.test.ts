import { describe, it, expect } from "vitest";
import { splitLocale, resolveLocaleRedirect } from "@/lib/locale-routing";

describe("splitLocale", () => {
  it("önekli dilleri ayırır", () => {
    expect(splitLocale("/en/lezzetlerimiz")).toEqual({ locale: "en", rest: "/lezzetlerimiz" });
    expect(splitLocale("/ar")).toEqual({ locale: "ar", rest: "/" });
  });
  it("öneksiz yol TR'dir", () => {
    expect(splitLocale("/lezzetlerimiz")).toEqual({ locale: "tr", rest: "/lezzetlerimiz" });
    expect(splitLocale("/")).toEqual({ locale: "tr", rest: "/" });
  });
  it("sınır: /english TR'dir (en değil)", () => {
    expect(splitLocale("/english").locale).toBe("tr");
  });
});

describe("resolveLocaleRedirect", () => {
  const allTr = { enabled: ["tr", "en", "ar"], defaultLocale: "tr" };
  it("varsayılan TR, hepsi açık → yönlendirme yok", () => {
    expect(resolveLocaleRedirect("/lezzetlerimiz", allTr)).toBeNull();
    expect(resolveLocaleRedirect("/en/x", allTr)).toBeNull();
    expect(resolveLocaleRedirect("/ar", allTr)).toBeNull();
    expect(resolveLocaleRedirect("/", allTr)).toBeNull();
  });

  const enDefault = { enabled: ["en", "ar"], defaultLocale: "en" };
  it("TR kapalı + varsayılan EN: TR yolu → /en/aynı yol", () => {
    expect(resolveLocaleRedirect("/lezzetlerimiz", enDefault)).toBe("/en/lezzetlerimiz");
    expect(resolveLocaleRedirect("/", enDefault)).toBe("/en");
    expect(resolveLocaleRedirect("/ar/x", enDefault)).toBeNull(); // ar açık
    expect(resolveLocaleRedirect("/en/x", enDefault)).toBeNull(); // varsayılan
  });

  const trNoEn = { enabled: ["tr", "ar"], defaultLocale: "tr" };
  it("EN kapalı, varsayılan TR: /en/x → /x (TR)", () => {
    expect(resolveLocaleRedirect("/en/x", trNoEn)).toBe("/x");
    expect(resolveLocaleRedirect("/en", trNoEn)).toBe("/");
    expect(resolveLocaleRedirect("/ar/y", trNoEn)).toBeNull();
  });

  it("döngü yok: hedef girdiyle aynıysa null", () => {
    expect(resolveLocaleRedirect("/en", enDefault)).toBeNull();
  });

  it("açık /tr öneki: varsayılan TR ise öneksize iner (404 önlenir)", () => {
    expect(resolveLocaleRedirect("/tr/lezzetlerimiz", allTr)).toBe("/lezzetlerimiz");
    expect(resolveLocaleRedirect("/tr", allTr)).toBe("/");
  });
  it("açık /tr öneki: varsayılan EN ise /en/aynı yola gider (/en/tr DEĞİL)", () => {
    expect(resolveLocaleRedirect("/tr/lezzetlerimiz", enDefault)).toBe("/en/lezzetlerimiz");
    expect(resolveLocaleRedirect("/tr", enDefault)).toBe("/en");
  });
});
