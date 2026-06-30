import Link from "next/link";

import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import type { PublicCatalogProduct } from "@/lib/public-store/types";
import { humanizeProductSpec } from "@/lib/catalog/display-text";

export default function ProductCard({
  product,
}: {
  product: PublicCatalogProduct;
}) {
  const imageUrl = productImageUrl(product.primary_image_path);
  const price = product.price_promo ?? product.price_normal;
  const soldOut = product.available_stock <= 0;


  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1727] transition duration-200 hover:border-emerald-300/45 hover:bg-[#0d1d31]">
      <Link href={`/products/${product.slug}`} className="block">
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

          <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-[#07111f]/15 to-transparent" />

          <div className="absolute left-3 top-3 flex max-w-[72%] flex-wrap gap-1.5">
            <span className="rounded-full border border-white/12 bg-[#06111f]/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-100 backdrop-blur">
              {product.game.name}
            </span>
            {product.is_popular ? (
              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950">
                Populer
              </span>
            ) : null}
          </div>

          <span
            className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-black ${
              soldOut
                ? "bg-red-500 text-white"
                : product.available_stock <= 3
                  ? "bg-amber-300 text-amber-950"
                  : "bg-emerald-400 text-emerald-950"
            }`}
          >
            {soldOut ? "Habis" : `${product.available_stock} stok`}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 text-base font-black leading-snug text-white sm:text-lg">
              {product.name}
            </h2>
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
