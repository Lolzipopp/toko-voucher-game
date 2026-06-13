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
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Pilih jumlah
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Maksimal {maxQuantity} akun sesuai stok saat ini.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="flex items-center overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                  aria-label="Kurangi jumlah"
                  className="h-12 w-12 text-xl font-black text-emerald-900 transition hover:bg-emerald-50 disabled:text-slate-300"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(event) => changeQuantity(Number(event.target.value))}
                  className="h-12 w-16 border-x border-emerald-100 bg-white text-center text-base font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Jumlah akun"
                />
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  aria-label="Tambah jumlah"
                  className="h-12 w-12 text-xl font-black text-emerald-900 transition hover:bg-emerald-50 disabled:text-slate-300"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total
                </p>
                <p className="mt-1 text-sm font-black text-emerald-700">
                  {formatRupiah(total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          ✓ {message}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="rounded-2xl border border-emerald-900 px-5 py-4 text-sm font-black text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {soldOut ? "Stok sedang habis" : `+ Keranjang (${quantity})`}
        </button>

        <button
          type="button"
          disabled={soldOut}
          onClick={handleBuyNow}
          className="rounded-2xl bg-[#103d2b] px-5 py-4 text-sm font-black text-white shadow-xl shadow-emerald-950/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        >
          {soldOut ? "Tidak tersedia" : `Beli ${quantity} sekarang`}
        </button>
      </div>

    </div>
  );
}
