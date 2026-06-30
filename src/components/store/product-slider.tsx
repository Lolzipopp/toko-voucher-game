"use client";

import { useMemo, useState } from "react";

import type { PublicCatalogProduct } from "@/lib/public-store/types";
import ProductCard from "./product-card";

type ProductSliderProps = {
  products: PublicCatalogProduct[];
  pageSize?: number;
};

export default function ProductSlider({ products, pageSize = 10 }: ProductSliderProps) {
  const [page, setPage] = useState(0);
  const pages = useMemo(() => {
    const chunks: PublicCatalogProduct[][] = [];
    for (let index = 0; index < products.length; index += pageSize) {
      chunks.push(products.slice(index, index + pageSize));
    }
    return chunks;
  }, [products, pageSize]);

  const totalPages = Math.max(1, pages.length);
  const currentProducts = pages[Math.min(page, totalPages - 1)] ?? [];

  function goToPage(nextPage: number) {
    const safePage = Math.min(totalPages - 1, Math.max(0, nextPage));
    setPage(safePage);
    document.getElementById("produk")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!products.length) return null;

  return (
    <div className="mt-6 sm:mt-8">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {currentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-7 flex flex-col items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#081322] p-3 sm:flex-row sm:p-4">
          <p className="text-sm font-bold text-slate-300">
            Slide {page + 1} dari {totalPages} · {products.length} akun
          </p>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="flex-1 touch-manipulation rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="flex-1 touch-manipulation rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:flex-none"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
