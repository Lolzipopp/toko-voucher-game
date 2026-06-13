"use client";

import Link from "next/link";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { useCart } from "@/components/store/cart-provider";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";

export default function CartPage() {
  const {
    items,
    subtotal,
    hydrated,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Keranjang
        </p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Produk pilihanmu</h1>
            <p className="mt-2 text-sm text-slate-500">
              Harga dan stok akan diverifikasi kembali saat checkout.
            </p>
          </div>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={clearCart}
              className="self-start rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              Kosongkan keranjang
            </button>
          ) : null}
        </div>

        {!hydrated ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Memuat keranjang...
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-black">Keranjangmu masih kosong</p>
            <p className="mt-2 text-sm text-slate-500">Pilih akun yang cocok dari katalog.</p>
            <Link
              href="/#produk"
              className="mt-5 inline-flex rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white"
            >
              Lihat katalog
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-3">
              {items.map((item) => {
                const image = productImageUrl(item.imagePath);
                const maxQuantity = item.productType === "unique" ? 1 : Math.max(1, item.availableStock);

                return (
                  <article
                    key={item.productId}
                    className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="h-28 w-full flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#103d2b] to-emerald-400 sm:w-40">
                      {image ? (
                        <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        {item.gameName}
                      </p>
                      <Link href={`/products/${item.slug}`} className="mt-1 block font-black hover:text-emerald-700">
                        {item.name}
                      </Link>
                      <p className="mt-2 text-sm font-black text-emerald-700">
                        {formatRupiah(item.unitPrice)} / akun
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Maksimal {maxQuantity} sesuai stok · Total {formatRupiah(item.unitPrice * item.quantity)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="h-10 w-10 text-lg font-black"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={maxQuantity}
                          value={item.quantity}
                          onChange={(event) =>
                            updateQuantity(item.productId, Number(event.target.value))
                          }
                          className="h-10 w-12 border-x border-slate-200 bg-white text-center text-sm font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={`Jumlah ${item.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= maxQuantity}
                          className="h-10 w-10 text-lg font-black disabled:text-slate-300"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-xs font-bold text-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-3xl bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10 lg:sticky lg:top-24">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                Ringkasan
              </p>
              <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-4 text-sm">
                <span className="text-white/65">Subtotal</span>
                <span className="font-black">{formatRupiah(subtotal)}</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/60">
                Biaya pembayaran akan dihitung setelah gateway dipilih. Stok baru dikunci saat checkout dibuat.
              </p>
              <Link
                href="/checkout"
                className="mt-5 flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-300"
              >
                Lanjut checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
          <StoreFooter />
</main>
  );
}
