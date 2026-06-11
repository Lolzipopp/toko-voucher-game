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
    <article className="group relative overflow-hidden rounded-3xl border border-sky-300/15 bg-[#0a1a2e] shadow-[0_18px_50px_rgba(0,0,0,.24)] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/45 hover:shadow-[0_20px_55px_rgba(16,185,129,.12)]">
      <div className="absolute right-3 top-3 z-20">
        <FavoriteButton product={engagementProduct} compact />
      </div>

      <Link
        href={`/products/${product.slug}`}
        className="block"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,.28),transparent_40%),linear-gradient(135deg,#0a2038,#06101d)]">
          {imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
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

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-[#06111f]/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
              {product.game.name}
            </span>

            {product.allow_negotiation ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
                Bisa nego
              </span>
            ) : null}

            {product.is_popular ? (
              <span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950">
                Populer
              </span>
            ) : null}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/65">
              {product.product_type === "mass"
                ? "Pengiriman digital"
                : "Akun unik"}
            </p>

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black ${
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

        <div className="p-5">
          <h2 className="line-clamp-2 text-lg font-black leading-snug text-white">
            {product.name}
          </h2>

          <div className="mt-3 flex min-h-14 flex-wrap content-start gap-2">
            {product.attributes.slice(0, 3).map((attribute) => (
              <span
                key={attribute.key}
                className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300"
              >
                {attribute.value}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              {product.price_promo ? (
                <p className="text-xs font-bold text-slate-500 line-through">
                  {formatRupiah(product.price_normal)}
                </p>
              ) : null}

              <p className="text-xl font-black text-emerald-300">
                {formatRupiah(price)}
              </p>
            </div>

            <span className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-xs font-black text-emerald-200 transition group-hover:bg-emerald-400 group-hover:text-emerald-950">
              {soldOut ? "Lihat produk" : "Beli sekarang"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
