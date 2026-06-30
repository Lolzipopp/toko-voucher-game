"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AddCartItem } from "@/lib/cart/types";
import { formatRupiah } from "@/lib/public-store/format";
import { useCart } from "./cart-provider";

export default function AddToCartButton({ item }: { item: AddCartItem }) {
  const router = useRouter();
  const { setItemQuantity, replaceCartWithItem } = useCart();
  const soldOut = item.availableStock <= 0;
  const maxQuantity = item.productType === "unique"
    ? 1
    : Math.max(1, Math.floor(item.availableStock));
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const total = useMemo(
    () => item.unitPrice * quantity,
    [item.unitPrice, quantity],
  );

  function changeQuantity(next: number) {
    setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(next))));
    setMessage(null);
  }

  function saveSelectedQuantity() {
    if (soldOut) return;
    setItemQuantity(item, quantity);
  }

  function handleAdd() {
    saveSelectedQuantity();
    setMessage(`${quantity} akun berhasil dimasukkan ke keranjang.`);
    window.setTimeout(() => setMessage(null), 2500);
  }

  function handleBuyNow() {
    if (soldOut) return;
    replaceCartWithItem(item, quantity);
    router.push("/checkout");
  }

  return (
    <div className="mt-6">
      {!soldOut ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                Pilih jumlah
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Maksimal {maxQuantity} akun sesuai stok saat ini.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="flex items-center overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]">
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                  aria-label="Kurangi jumlah"
                  className="h-12 w-12 touch-manipulation text-xl font-black text-emerald-200 transition hover:bg-white/[0.05] disabled:text-slate-600"
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
                  className="h-12 w-16 border-x border-white/10 bg-[#07111f] text-center text-base font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Jumlah akun"
                />
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  aria-label="Tambah jumlah"
                  className="h-12 w-12 touch-manipulation text-xl font-black text-emerald-200 transition hover:bg-white/[0.05] disabled:text-slate-600"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-sm font-black text-emerald-300">
                  {formatRupiah(total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
          ✓ {message}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="touch-manipulation rounded-2xl border border-white/12 px-5 py-4 text-sm font-black text-white transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-slate-500"
        >
          {soldOut ? "Stok sedang habis" : `+ Keranjang (${quantity})`}
        </button>

        <button
          type="button"
          disabled={soldOut}
          onClick={handleBuyNow}
          className="touch-manipulation rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-500"
        >
          {soldOut ? "Tidak tersedia" : `Beli ${quantity} sekarang`}
        </button>
      </div>

    </div>
  );
}
