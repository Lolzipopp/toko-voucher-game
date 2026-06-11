"use client";

import { useEffect, useState } from "react";

import {
  getCompareProducts,
  toggleCompare,
  type CompareProduct,
} from "@/lib/store-engagement/compare";

export default function CompareButton({
  product,
  compact = false,
}: {
  product: CompareProduct;
  compact?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () =>
      setActive(getCompareProducts().some((item) => item.id === product.id));
    sync();
    window.addEventListener("riku-store:compare-change", sync);
    return () => window.removeEventListener("riku-store:compare-change", sync);
  }, [product.id]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const result = toggleCompare(product);
          setActive(result.active);
          setMessage(result.full ? "Maksimal 3 produk" : "");
          if (result.full) window.setTimeout(() => setMessage(""), 1800);
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border font-black transition ${active ? "border-sky-400/40 bg-sky-400/15 text-sky-200" : "border-white/15 bg-white/[.04] text-slate-300 hover:border-sky-400/40 hover:text-sky-200"} ${compact ? "h-10 w-10 text-sm" : "px-4 py-3 text-sm"}`}
      >
        ⇄ {!compact ? (active ? "Dibandingkan" : "Bandingkan") : null}
      </button>
      {message ? <span className="absolute right-0 top-full z-30 mt-2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs text-white shadow-xl">{message}</span> : null}
    </div>
  );
}
