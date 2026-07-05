import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AddToCartButton from "@/components/store/add-to-cart-button";
import FavoriteButton from "@/components/store/favorite-button";
import { CartSvgIcon, WhatsAppSvgIcon } from "@/components/store/icon-button-parts";
import ProductImageCarousel from "@/components/store/product-image-carousel";
import ProductCard from "@/components/store/product-card";
import RecentlyViewedRecorder from "@/components/store/recently-viewed-recorder";
import RestockRequestButton from "@/components/store/restock-request-button";
import ShareProductButton from "@/components/store/share-product-button";
import { humanizeProductDescription } from "@/lib/catalog/display-text";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import { getPublicStoreSettings } from "@/lib/public-store/settings";
import type { PublicCatalogProduct, PublicProductDetail } from "@/lib/public-store/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

async function getProduct(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_product_by_slug",
    {
      p_slug: slug,
    },
  );

  if (error) {
    throw new Error(`Gagal memuat produk: ${error.message}`);
  }

  return (data ?? null) as PublicProductDetail | null;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Akun tidak ketemu — RIKU STORE",
    };
  }

  return {
    title: `${product.name} — RIKU STORE`,
    description:
      product.description ??
      `Akun ${product.game.name} dengan pengiriman digital dan garansi.`,
  };
}

export default async function ProductDetailPage({
  params,
}: Props) {
  const { slug } = await params;
  const [product, publicSettings] = await Promise.all([
    getProduct(slug),
    getPublicStoreSettings(),
  ]);

  if (!product) {
    notFound();
  }

  const mainImage = productImageUrl(product.images[0]?.path);
  const price = product.price_promo ?? product.price_normal;
  const soldOut = product.available_stock <= 0;

  const viewedProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    gameName: product.game.name,
    price: Number(price),
    imageUrl: mainImage,
    availableStock: Number(product.available_stock),
  };


  const whatsappNumber = (
    publicSettings.whatsapp_number ??
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    ""
  ).replace(/\D/g, "");

  const whatsappMessage = encodeURIComponent(
    `Halo RIKU STORE, saya tertarik dengan ${product.name}. Masih ready?`,
  );

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : null;

  const supabase = await createClient();
  const { data: catalogData } = await supabase.rpc("get_public_catalog", {
    p_game_slug: product.game.slug,
    p_search: null,
  });
  const relatedProducts = ((catalogData ?? []) as PublicCatalogProduct[])
    .filter((item) => item.id !== product.id)
    .toSorted((a, b) => {
      const aSoldOut = a.available_stock <= 0;
      const bSoldOut = b.available_stock <= 0;
      if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
      return Number(a.price_promo ?? a.price_normal) - Number(b.price_promo ?? b.price_normal);
    })
    .slice(0, 8);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f7f9] text-slate-950">
      <RecentlyViewedRecorder product={viewedProduct} />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:py-12">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/#produk"
            className="text-sm font-bold text-slate-600 hover:text-emerald-700"
          >
            ← Kembali
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              aria-label="Buka keranjang"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <CartSvgIcon className="h-5 w-5" />
            </Link>
            <ShareProductButton title={product.name} />
          </div>
        </div>

        <div className="mt-4 grid min-w-0 gap-5 sm:mt-5 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <section className="min-w-0">
            <ProductImageCarousel
              images={product.images.map((image) => ({
                url: productImageUrl(image.path) ?? "",
                alt: image.alt || product.name,
              }))}
              gameName={product.game.name}
              availableStock={Number(product.available_stock)}
            />


          </section>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 sm:rounded-[32px] sm:p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                  {product.game.name}
                </span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${soldOut ? "bg-red-500 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                  {soldOut ? "Stok habis" : `${product.available_stock} stok ready`}
                </span>
              </div>

              <h1 className="mt-4 break-words text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                {product.name}
              </h1>

              <div className="mt-5">
                <FavoriteButton product={viewedProduct} />
              </div>

              {product.description ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Keterangan
                  </p>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-700">
                    {humanizeProductDescription(product.description)}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 border-y border-slate-100 py-5">
                {product.price_promo ? (
                  <p className="text-sm font-bold text-slate-500 line-through">
                    {formatRupiah(product.price_normal)}
                  </p>
                ) : null}

                <p className="text-3xl font-black text-emerald-700">
                  {formatRupiah(price)}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <p className="text-xs font-black text-slate-900">
                    Dikirim setelah bayar
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Setelah pembayaran dicek admin
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <p className="text-xs font-black text-slate-900">
                    Garansi {product.warranty_days} hari
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sesuai aturan toko
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {soldOut ? (
                  whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-black text-amber-950"
                    >
                      <WhatsAppSvgIcon className="mr-2 h-5 w-5" />
                      Hubungi admin
                    </a>
                  ) : (
                    <RestockRequestButton productName={product.name} />
                  )
                ) : (
                  <AddToCartButton
                    item={{
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    gameName: product.game.name,
                    productType: product.product_type,
                    unitPrice: price,
                    availableStock: product.available_stock,
                    imagePath: product.images[0]?.path ?? null,
                    }}
                  />
                )}
              </div>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex w-full touch-manipulation items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  <WhatsAppSvgIcon className="mr-2 h-4 w-4" />
                  Hubungi admin WA
                </a>
              ) : null}

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-[11px] font-bold leading-5 text-amber-800">
                Jangan melakukan pembayaran sebelum mendapat arahan dari admin.
              </div>
            </div>
          </aside>
        </div>

        {relatedProducts.length ? (
          <section className="mt-10 sm:mt-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  Tawaran serupa
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Produk mirip yang mungkin cocok
                </h2>
              </div>
              <Link
                href={`/?game=${product.game.slug}#produk`}
                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
              >
                Lihat semua
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

    </main>
  );
}
