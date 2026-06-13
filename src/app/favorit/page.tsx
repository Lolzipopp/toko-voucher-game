"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { formatRupiah } from "@/lib/format/display";
import {
  getFavorites,
  removeFavorite,
} from "@/lib/store-engagement/storage";
import type { EngagementProduct } from "@/lib/store-engagement/types";


export default function FavoritesPage() {
  const [products, setProducts] = useState<EngagementProduct[]>([]);

  useEffect(() => {
    const sync = () => setProducts(getFavorites());
    sync();

    window.addEventListener("riku-store:engagement-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("riku-store:engagement-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#06111e] text-white">
      <StoreHeader />

      <section className="border-b border-white/10 bg-[#0a1b2c]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            Produk tersimpan
          </p>
          <h1 className="mt-2 text-4xl font-black italic">
            FAVORIT SAYA
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Favorit tersimpan di browser perangkat ini dan tidak membutuhkan login.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]"
              >
                <Link href={`/products/${product.slug}`}>
                  <div className="aspect-video bg-slate-900">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-5xl">
                        🎮
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    {product.gameName}
                  </p>
                  <Link
                    href={`/products/${product.slug}`}
                    className="mt-1 block line-clamp-2 text-lg font-black hover:text-emerald-200"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-3 font-black text-emerald-300">
                    {formatRupiah(product.price)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {product.availableStock > 0
                      ? `${product.availableStock} stok tersedia`
                      : "Stok habis"}
                  </p>

                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-xs font-black text-emerald-950"
                    >
                      Lihat produk
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        removeFavorite(product.id);
                        setProducts(getFavorites());
                      }}
                      className="rounded-xl border border-rose-400/30 px-4 py-3 text-xs font-black text-rose-200"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.03] p-12 text-center">
            <div className="text-5xl">♡</div>
            <h2 className="mt-4 text-2xl font-black">
              Belum ada produk favorit
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Tekan ikon hati pada produk yang ingin kamu simpan.
            </p>
            <Link
              href="/#produk"
              className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950"
            >
              Lihat katalog
            </Link>
          </div>
        )}
      </section>

      <StoreFooter />
    </main>
  );
}
