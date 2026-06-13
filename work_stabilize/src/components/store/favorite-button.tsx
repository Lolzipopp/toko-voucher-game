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
          ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      } ${compact ? "h-10 w-10 text-lg" : "px-4 py-3 text-sm"}`}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
      {!compact ? (active ? "Tersimpan" : "Simpan favorit") : null}
    </button>
  );
}
