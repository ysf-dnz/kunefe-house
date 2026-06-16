"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addItem, cartCount, cartSubtotal, MAX_QTY, type CartItem } from "@/lib/cart";

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "kh_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* yoksay */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* yoksay */ }
  }, [items]);

  const add = (item: CartItem) => setItems((cur) => addItem(cur, item));
  const setQty = (productId: string, qty: number) =>
    setItems((cur) =>
      cur
        .map((i) => (i.productId === productId ? { ...i, qty: Math.max(0, Math.min(qty, MAX_QTY)) } : i))
        .filter((i) => i.qty > 0)
    );
  const remove = (productId: string) => setItems((cur) => cur.filter((i) => i.productId !== productId));
  const clear = () => setItems([]);

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, count: cartCount(items), subtotal: cartSubtotal(items) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
