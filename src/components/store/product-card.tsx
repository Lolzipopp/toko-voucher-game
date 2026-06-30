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
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:scale-[0.99]">
      <Link href={`/products/${product.slug}`} className="block touch-manipulation focus:outline-none focus:ring-4 focus:ring-emerald-200">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
          {imageUrl ? (
            <div
              className={`absolute inset-0 bg-contain bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.01] ${soldOut ? "grayscale opacity-45" : ""}`}
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-black text-slate-400">GAME</span>
            </div>
          )}

          <div className="absolute right-3 top-3 z-20">
            <FavoriteButton product={engagementProduct} compact />
          </div>

          <div className="absolute left-3 top-3 flex max-w-[62%] flex-wrap gap-1.5">
            <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 backdrop-blur">
              {product.game.name}
            </span>
            {product.is_popular ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
                Populer
              </span>
            ) : null}
          </div>

          <span
            className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-black ${
              soldOut
                ? "bg-red-100 text-red-700"
                : product.available_stock <= 3
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {soldOut ? "Habis" : `${product.available_stock} stok`}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <h2 className="line-clamp-2 text-base font-black leading-snug text-slate-950 sm:text-lg">
            {product.name}
          </h2>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.attributes.slice(0, 2).map((attribute) => (
              <span
                key={attribute.key}
                className="line-clamp-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600"
              >
                {humanizeProductSpec(attribute.value)}
              </span>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            {product.price_promo ? (
              <p className="text-xs font-bold text-slate-400 line-through">
                {formatRupiah(product.price_normal)}
              </p>
            ) : null}

            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-xl font-black text-emerald-700">
                {formatRupiah(price)}
              </p>
              <span className="rounded-xl bg-emerald-700 px-3 py-2.5 text-[11px] font-black text-white transition group-hover:bg-emerald-800 sm:px-4 sm:text-xs">
                {soldOut ? "Habis" : "Beli"}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
