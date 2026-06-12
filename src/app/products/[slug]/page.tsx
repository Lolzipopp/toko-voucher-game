import NegotiationBox from "@/components/store/negotiation-box";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AddToCartButton from "@/components/store/add-to-cart-button";
import FavoriteButton from "@/components/store/favorite-button";
import ProductImageCarousel from "@/components/store/product-image-carousel";
import RecentlyViewedRecorder from "@/components/store/recently-viewed-recorder";
import RestockRequestButton from "@/components/store/restock-request-button";
import ShareProduct from "@/components/store/share-product";
import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import { getPublicStoreSettings } from "@/lib/public-store/settings";
import type { PublicProductDetail } from "@/lib/public-store/types";
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
      title: "Produk tidak ditemukan — RIKU STORE",
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

  const engagementProduct = {
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
    `Halo RIKU STORE, saya tertarik dengan ${product.name}. Apakah masih tersedia?`,
  );

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : null;

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <RecentlyViewedRecorder product={engagementProduct} />

      <StoreHeader />

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:py-12">
        <Link
          href="/#produk"
          className="text-sm font-bold text-emerald-700"
        >
          ← Kembali ke katalog
        </Link>

        <div className="mt-4 grid gap-5 sm:mt-5 sm:gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <section>
            <ProductImageCarousel
              images={product.images.map((image) => ({
                url: productImageUrl(image.path) ?? "",
                alt: image.alt || product.name,
              }))}
              gameName={product.game.name}
              availableStock={Number(product.available_stock)}
            />

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-5 sm:p-6">
              <h2 className="text-lg font-black">
                Spesifikasi akun
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {product.attributes.map((attribute) => (
                  <div
                    key={attribute.key}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {attribute.key.replaceAll("_", " ")}
                    </p>

                    <p className="mt-1 text-sm font-black">
                      {attribute.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[24px] border border-emerald-950/10 bg-white p-4 shadow-xl shadow-emerald-950/8 sm:rounded-[32px] sm:p-8">
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:mt-3 sm:text-3xl">
                {product.name}
              </h1>

              <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                {product.description ??
                  "Akun dengan spesifikasi sesuai informasi produk. Data akun dikirim setelah pembayaran terverifikasi."}
              </p>

              <div className="mt-6 border-y border-slate-100 py-5">
                {product.price_promo ? (
                  <p className="text-sm font-bold text-slate-400 line-through">
                    {formatRupiah(product.price_normal)}
                  </p>
                ) : null}

                <p className="text-3xl font-black text-emerald-700">
                  {formatRupiah(price)}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 sm:p-4">
                  <p className="text-xs font-black text-emerald-900">
                    ⚡ Pengiriman instan
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800">
                    Setelah pembayaran
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3 sm:p-4">
                  <p className="text-xs font-black text-emerald-900">
                    🛡️ {product.warranty_days} hari
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800">
                    Sesuai ketentuan
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <FavoriteButton product={engagementProduct} />
<ShareProduct
                  name={product.name}
                  slug={product.slug}
                  price={engagementProduct.price}
                />
              </div>

              <div className="mt-5">
                {soldOut ? (
                  <RestockRequestButton productName={product.name} />
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

              {product.product_type === "unique" ? (
                <NegotiationBox
                  productName={product.name}
                  productSlug={product.slug}
                  currentPrice={Number(price)}
                  minimumOffer={
                    product.negotiation_min_price === null
                      ? null
                      : Number(product.negotiation_min_price)
                  }
                  whatsappNumber={whatsappNumber || null}
                  storeName={publicSettings.store_name}
                />
              ) : null}

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex w-full items-center justify-center rounded-2xl px-5 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                >
                  Tanya via WhatsApp
                </a>
              ) : null}

              <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                Jangan transfer di luar instruksi resmi RIKU STORE.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <StoreFooter />
    </main>
  );
}
