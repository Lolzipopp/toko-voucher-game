import Link from "next/link";

import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import type { PublicCatalogProduct } from "@/lib/public-store/types";
import { humanizeProductSpec } from "@/lib/catalog/display-text";
import FavoriteButton from "@/components/store/favorite-button";

export default function ProductCard({
  product,
}: {
  product: PublicCatalogProduct;
}) {
  const imageUrl = productImageUrl(product.primary_image_path);
  const price = product.price_promo ?? product.price_normal;
  const soldOut = product.available_stock <= 0;
  const engagementProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    gameName: product.game.name,
    price: Number(price),
    imageUrl,
    availableStock: Number(product.available_stock),
  };

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1727] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:bg-[#0d1d31] active:scale-[0.99]">
      <Link href={`/products/${product.slug}`} className="block touch-manipulation focus:outline-none focus:ring-4 focus:ring-emerald-300/20">
        <div className="relative aspect-[16/9] overflow-hidden bg-[#081322]">
          {imageUrl ? (
            <div
              className={`absolute inset-0 bg-contain bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.01] ${soldOut ? "grayscale opacity-45" : ""}`}
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-black text-slate-300">GAME</span>
            </div>
          )}

          {soldOut ? (
            <div className="absolute inset-0 bg-[#07111f]/55" />
          ) : null}

          {soldOut ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white">
              Habis
            </span>
          ) : null}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 min-w-0 text-base font-black leading-snug text-white sm:text-lg">
              {product.name}
            </h2>
            <div className="shrink-0">
              <FavoriteButton product={engagementProduct} compact />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">
              {product.game.name}
            </span>
            {product.is_popular ? (
              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950">
                Populer
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.attributes.slice(0, 2).map((attribute) => (
              <span
                key={attribute.key}
                className="line-clamp-1 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-300"
              >
                {humanizeProductSpec(attribute.value)}
              </span>
            ))}
          </div>

          <div className="mt-4 border-t border-white/8 pt-4">
            {product.price_promo ? (
              <p className="text-xs font-bold text-slate-500 line-through">
                {formatRupiah(product.price_normal)}
              </p>
            ) : null}

            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-xl font-black text-emerald-300">
                {formatRupiah(price)}
              </p>
              <span className="rounded-xl bg-emerald-400 px-3 py-2.5 text-[11px] font-black text-emerald-950 transition group-hover:bg-emerald-300 sm:px-4 sm:text-xs">
                {soldOut ? "Habis" : "Beli"}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
