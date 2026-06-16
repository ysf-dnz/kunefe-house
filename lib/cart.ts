export type CartItem = {
  productId: string;
  title: string;
  price: number;
  qty: number;
  imageUrl: string | null;
};

export const MAX_QTY = 99;

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

export function addItem(items: CartItem[], next: CartItem): CartItem[] {
  const i = items.findIndex((x) => x.productId === next.productId);
  if (i === -1) return [...items, { ...next, qty: Math.min(next.qty, MAX_QTY) }];
  const copy = items.slice();
  copy[i] = { ...copy[i], qty: Math.min(copy[i].qty + next.qty, MAX_QTY) };
  return copy;
}
