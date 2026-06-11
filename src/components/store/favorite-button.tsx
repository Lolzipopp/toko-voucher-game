"use client";

import { useSyncExternalStore } from "react";

import {
  isFavorite,
  toggleFavorite,
} from "@/lib/store-engagement/storage";
import type { EngagementProduct } from "@/lib/store-engagement/types";

type FavoriteButtonProps = {
  product: EngagementProduct;
  compact?: boolean;
};

export default function FavoriteButton({
  product,
  compact = false,
}: FavoriteButtonProps) {
  const active = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(
        "riku-store:engagement-change",
        onStoreChange,
      );

      return () =>
        window.removeEventListener(
          "riku-store:engagement-change",
          onStoreChange,
        );
    },
    () => isFavorite(product.id),
    () => false,
  );

  return (
    <button
      type="button"
      aria-label={active ? "Hapus dari favorit" : "Simpan ke favorit"}
      title={active ? "Hapus dari favorit" : "Simpan ke favorit"}
      onClick={() => toggleFavorite(product)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-black transition ${
        active
          ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
          : "border-white/15 bg-white/[.04] text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
      } ${compact ? "h-10 w-10 text-lg" : "px-4 py-3 text-sm"}`}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
      {!compact ? (active ? "Tersimpan" : "Simpan favorit") : null}
    </button>
  );
}
