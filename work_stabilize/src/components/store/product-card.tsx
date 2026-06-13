import Link from "next/link";

import FavoriteButton from "@/components/store/favorite-button";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import type { PublicCatalogProduct } from "@/lib/public-store/types";

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
    <article className="group relative overflow-hidden rounded-[1.25rem] border sm:rounded-3xl border-sky-300/15 bg-[#0a1a2e] shadow-[0_18px_50px_rgba(0,0,0,.24)] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/45 hover:shadow-[0_20px_55px_rgba(16,185,129,.12)]">
      <div className="absolute right-2.5 top-2.5 z-20 sm:right-3 sm:top-3">
        <FavoriteButton product={engagementProduct} compact />
      </div>

      <Link
        href={`/products/${product.slug}`}
        className="block"
      >
        <div className="relative aspect-[2/1] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,.28),transparent_40%),linear-gradient(135deg,#0a2038,#06101d)]">
          {imageUrl ? (
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat transition duration-500 group-hover:scale-[1.01]"
              style={{
                backgroundImage: `url(${imageUrl})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-5xl opacity-60">🎮</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#06111f] via-transparent to-[#06111f]/20" />

          <div className="absolute left-2.5 top-2.5 flex max-w-[78%] flex-wrap gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
            <span className="rounded-full border border-white/15 bg-[#06111f]/80 px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
              {product.game.name}
            </span>

            {product.product_type === "unique" ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px] font-black uppercase tracking-wider text-amber-200">
                Bisa nego
              </span>
            ) : null}

            {product.is_popular ? (
              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px] font-black uppercase tracking-wider text-amber-950">
                Populer
              </span>
            ) : null}
          </div>

          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 text-white sm:bottom-4 sm:left-4 sm:right-4 sm:gap-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/75">
              Pengiriman instan
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-[9px] sm:px-3 sm:text-[10px] font-black ${
                soldOut
                  ? "bg-red-500 text-white"
                  : product.available_stock <= 3
                    ? "bg-amber-300 text-amber-950"
                    : "bg-emerald-400 text-emerald-950"
              }`}
            >
              {soldOut
                ? "Habis"
                : `${product.available_stock} tersedia`}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <h2 className="line-clamp-2 min-h-11 text-base font-black leading-snug text-white sm:min-h-0 sm:text-lg">
            {product.name}
          </h2>

          <div className="mt-3 flex min-h-11 flex-wrap content-start gap-1.5 sm:min-h-14 sm:gap-2">
            {product.attributes.slice(0, 3).map((attribute) => (
              <span
                key={attribute.key}
                className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300"
              >
                {attribute.value}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-end justify-between gap-2 sm:mt-5 sm:gap-3">
            <div>
              {product.price_promo ? (
                <p className="text-xs font-bold text-slate-500 line-through">
                  {formatRupiah(product.price_normal)}
                </p>
              ) : null}

              <p className="text-lg font-black text-emerald-300 sm:text-xl">
                {formatRupiah(price)}
              </p>
            </div>

            <span className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-black sm:px-4 sm:text-xs text-emerald-200 transition group-hover:bg-emerald-400 group-hover:text-emerald-950">
              {soldOut ? "Lihat produk" : "Beli sekarang"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
