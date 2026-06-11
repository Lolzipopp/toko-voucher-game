"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearRecentlyViewed,
  getRecentlyViewed,
} from "@/lib/store-engagement/storage";
import type { EngagementProduct } from "@/lib/store-engagement/types";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RecentlyViewedSection() {
  const [products, setProducts] = useState<EngagementProduct[]>([]);

  useEffect(() => {
    const sync = () => setProducts(getRecentlyViewed());
    sync();

    window.addEventListener("riku-store:engagement-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("riku-store:engagement-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="border-y border-white/8 bg-[#071320]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Riwayat produk
            </p>
            <h2 className="mt-2 text-3xl font-black italic">
              BARU KAMU LIHAT
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              clearRecentlyViewed();
              setProducts([]);
            }}
            className="self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-400 hover:text-white sm:self-auto"
          >
            Bersihkan riwayat
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] transition hover:-translate-y-1 hover:border-emerald-400/35"
            >
              <div className="aspect-video bg-slate-900">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-4xl">
                    🎮
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  {product.gameName}
                </p>
                <h3 className="mt-1 line-clamp-2 font-black text-white">
                  {product.name}
                </h3>
                <p className="mt-3 font-black text-emerald-300">
                  {rupiah(product.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
