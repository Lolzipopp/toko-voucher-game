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
      className="flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:flex-row"
      onSubmit={handleSubmit}
    >
      <input
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari level, fruit, sword, bonus..."
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 sm:w-auto sm:py-2.5"
      >
        Cari
      </button>
    </form>
  );
}
