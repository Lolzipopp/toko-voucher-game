"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AddCartItem } from "@/lib/cart/types";
import { formatRupiah } from "@/lib/public-store/format";
import { useCart } from "./cart-provider";

export default function AddToCartButton({ item }: { item: AddCartItem }) {
  const router = useRouter();
  const { addItem, replaceCartWithItem } = useCart();
  const soldOut = item.availableStock <= 0;
  const maxQuantity = item.productType === "unique"
    ? 1
    : Math.max(1, Math.floor(item.availableStock));
  const [quantity, setQuantity] = useState(1);

  function changeQuantity(next: number) {
    setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(next))));
  }

  function handleAddToCart() {
    if (soldOut) return;
    addItem(item, quantity);
  }

  function handleBuyNow() {
    if (soldOut) return;
    replaceCartWithItem(item, quantity);
    router.push("/checkout");
  }

  return (
    <div className="mt-6">
      {!soldOut && maxQuantity > 1 ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-black text-slate-700">Jumlah</p>
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Kurangi jumlah"
              className="h-11 w-11 touch-manipulation text-xl font-black text-slate-800 disabled:text-slate-300"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(event) => changeQuantity(Number(event.target.value))}
              className="h-11 w-14 border-x border-slate-200 bg-white text-center text-base font-black text-slate-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Jumlah akun"
            />
            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={quantity >= maxQuantity}
              aria-label="Tambah jumlah"
              className="h-11 w-11 touch-manipulation text-xl font-black text-slate-800 disabled:text-slate-300"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_1.25fr]">
        <button
          type="button"
          disabled={soldOut}
          onClick={handleAddToCart}
          className="w-full touch-manipulation rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {soldOut ? "Habis" : "Tambah keranjang"}
        </button>

        <button
          type="button"
          disabled={soldOut}
          onClick={handleBuyNow}
          className="w-full touch-manipulation rounded-2xl bg-emerald-700 px-5 py-4 text-base font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {soldOut ? "Habis" : `Beli sekarang · ${formatRupiah(item.unitPrice * quantity)}`}
        </button>
      </div>
    </div>
  );
}
