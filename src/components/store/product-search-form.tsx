"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ProductSearchFormProps = {
  initialQuery?: string;
  game?: string;
};

export default function ProductSearchForm({ initialQuery = "", game }: ProductSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const normalizedQuery = query.trim();

    if (game) params.set("game", game);
    if (normalizedQuery) params.set("q", normalizedQuery);

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
      className="flex w-full max-w-2xl flex-col gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 sm:flex-row"
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
        placeholder="Cari akun..."
        className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-200"
      />
      <button
        type="submit"
        className="touch-manipulation rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-[0.96]"
      >
        Cari
      </button>
    </form>
  );
}
