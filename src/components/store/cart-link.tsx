"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export default function CartLink() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="relative rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-300"
    >
      Keranjang
      {hydrated && itemCount > 0 ? (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-emerald-950">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
