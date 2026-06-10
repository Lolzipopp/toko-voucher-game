import Link from "next/link";
import type { PublicCatalogProduct } from "@/lib/public-store/types";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";

export default function ProductCard({ product }: { product: PublicCatalogProduct }) {
  const imageUrl = productImageUrl(product.primary_image_path);
  const price = product.price_promo ?? product.price_normal;
  const soldOut = product.available_stock <= 0;
  return (
    <article className="group overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#103d2b] via-emerald-700 to-emerald-400">
          {imageUrl ? <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${imageUrl})` }} /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 backdrop-blur">{product.game.name}</span>
            {product.is_popular ? <span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950">Populer</span> : null}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
            <p className="text-xs font-bold">{product.product_type === "mass" ? "Pengiriman instan" : "Akun unik"}</p>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${soldOut ? "bg-red-500" : product.available_stock <= 3 ? "bg-amber-400 text-amber-950" : "bg-emerald-400 text-emerald-950"}`}>
              {soldOut ? "Habis" : `${product.available_stock} tersedia`}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h2 className="line-clamp-2 text-lg font-black leading-snug text-slate-950">{product.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.attributes.slice(0, 3).map((attribute) => (
              <span key={attribute.key} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{attribute.value}</span>
            ))}
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              {product.price_promo ? <p className="text-xs font-bold text-slate-400 line-through">{formatRupiah(product.price_normal)}</p> : null}
              <p className="text-xl font-black text-emerald-700">{formatRupiah(price)}</p>
            </div>
            <span className="rounded-xl bg-[#103d2b] px-4 py-2.5 text-xs font-black text-white transition group-hover:bg-emerald-700">Lihat detail</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
