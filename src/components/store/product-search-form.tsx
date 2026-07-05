"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ProductSort = "default" | "price-asc" | "price-desc" | "stock-ready" | "popular";

type ProductSearchFormProps = {
  initialQuery?: string;
  game?: string;
  sort?: ProductSort;
};

export default function ProductSearchForm({ initialQuery = "", game, sort = "default" }: ProductSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const normalizedQuery = query.trim();

    const selectedSort = new FormData(event.currentTarget).get("sort")?.toString() ?? "default";

    if (game) params.set("game", game);
    if (normalizedQuery) params.set("q", normalizedQuery);
    if (selectedSort !== "default") params.set("sort", selectedSort);

    const target = params.size > 0 ? `/?${params.toString()}#produk` : "/#produk";
    router.push(target, { scroll: false });

    window.requestAnimationFrame(() => {
      document.getElementById("produk")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <form
      className="flex w-full max-w-2xl flex-col gap-2 rounded-3xl border border-white/10 bg-[#0a1727] p-2 sm:flex-row"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="product-search">
        Cari
      </label>
      <input
        id="product-search"
        name="q"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari..."
        className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-300/35"
      />
      <label className="sr-only" htmlFor="product-sort">
        Urutkan produk
      </label>
      <select
        id="product-sort"
        name="sort"
        defaultValue={sort}
        className="min-w-0 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-black text-white outline-none focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-300/35"
        aria-label="Urutkan produk"
      >
        <option className="bg-slate-950" value="default">Default</option>
        <option className="bg-slate-950" value="price-asc">Murah ke mahal</option>
        <option className="bg-slate-950" value="price-desc">Mahal ke murah</option>
        <option className="bg-slate-950" value="stock-ready">Ready dulu</option>
        <option className="bg-slate-950" value="popular">Populer dulu</option>
      </select>
      <button
        type="submit"
        className="touch-manipulation rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-300/25 active:scale-[0.96]"
      >
        Terapkan
      </button>
    </form>
  );
}
