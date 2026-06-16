import { describe, it, expect } from "vitest";
import { cartSubtotal, cartCount, addItem, type CartItem } from "@/lib/cart";

const a: CartItem = { productId: "p1", title: "Künefe", price: 100, qty: 2, imageUrl: null };
const b: CartItem = { productId: "p2", title: "Baklava", price: 50, qty: 1, imageUrl: null };

describe("cart", () => {
  it("ara toplam = fiyat*adet toplamı", () => {
    expect(cartSubtotal([a, b])).toBe(250);
  });
  it("adet = qty toplamı", () => {
    expect(cartCount([a, b])).toBe(3);
  });
  it("addItem aynı ürünü artırır, yenisini ekler", () => {
    const r1 = addItem([a], { ...a, qty: 1 });
    expect(r1).toHaveLength(1);
    expect(r1[0].qty).toBe(3);
    const r2 = addItem([a], b);
    expect(r2).toHaveLength(2);
  });
  it("qty 99 ile sınırlanır", () => {
    const r = addItem([{ ...a, qty: 98 }], { ...a, qty: 5 });
    expect(r[0].qty).toBe(99);
  });
});
