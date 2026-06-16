"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartIcon({ href }: { href: string }) {
  const { count } = useCart();
  return (
    <Link href={href} className="relative inline-flex items-center text-cream hover:text-gold" aria-label="Sepet">
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <path d="M3 3h2l2.4 12.3a1 1 0 0 0 1 .7h9.2a1 1 0 0 0 1-.8L21 7H6" />
        <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-forest-deep">
          {count}
        </span>
      )}
    </Link>
  );
}
