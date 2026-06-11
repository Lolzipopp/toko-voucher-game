import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import AddToCartButton from "@/components/store/add-to-cart-button";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import type { PublicProductDetail } from "@/lib/public-store/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_product_by_slug", { p_slug: slug });
  if (error) throw new Error(`Gagal memuat produk: ${error.message}`);
  return (data ?? null) as PublicProductDetail | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const product = await getProduct(slug);
  if (!product) return { title: "Produk tidak ditemukan — RIKU STORE" };
  return { title: `${product.name} — RIKU STORE`, description: product.description ?? `Akun ${product.game.name} dengan pengiriman instan dan garansi.` };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params; const product = await getProduct(slug); if (!product) notFound();
  const mainImage = productImageUrl(product.images[0]?.path); const price = product.price_promo ?? product.price_normal; const soldOut = product.available_stock <= 0;
  const wa = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const waMessage = encodeURIComponent(`Halo RIKU STORE, saya tertarik dengan ${product.name}. Apakah masih tersedia?`);
  const buyHref = wa ? `https://wa.me/${wa}?text=${waMessage}` : "#checkout-segera";
  return <main className="min-h-screen bg-[#f7fbf8] text-slate-950"><StoreHeader />
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/#produk" className="text-sm font-bold text-emerald-700">← Kembali ke katalog</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#103d2b] via-emerald-700 to-emerald-400 shadow-2xl shadow-emerald-950/15">
            {mainImage ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${mainImage})` }} /> : null}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
            <div className="absolute bottom-5 left-5 flex gap-2"><span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-emerald-800">{product.game.name}</span><span className={`rounded-full px-4 py-2 text-xs font-black ${soldOut ? 'bg-red-500 text-white' : 'bg-emerald-300 text-emerald-950'}`}>{soldOut ? 'Stok habis' : `${product.available_stock} stok tersedia`}</span></div>
          </div>
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">Spesifikasi akun</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{product.attributes.map((a) => <div key={a.key} className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{a.key.replaceAll('_',' ')}</p><p className="mt-1 text-sm font-black">{a.value}</p></div>)}</div></div>
        </section>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[32px] border border-emerald-950/10 bg-white p-6 shadow-xl shadow-emerald-950/8 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{product.product_type === 'mass' ? 'Produk massal' : 'Akun unik'}</p><h1 className="mt-3 text-3xl font-black leading-tight tracking-tight">{product.name}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description ?? 'Akun dengan spesifikasi sesuai informasi produk. Data akun dikirim setelah pembayaran terverifikasi.'}</p>
            <div className="mt-6 border-y border-slate-100 py-5">{product.price_promo ? <p className="text-sm font-bold text-slate-400 line-through">{formatRupiah(product.price_normal)}</p> : null}<p className="text-3xl font-black text-emerald-700">{formatRupiah(price)}</p></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black text-emerald-900">⚡ Instan</p><p className="mt-1 text-[11px] text-emerald-800">Setelah pembayaran</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black text-emerald-900">🛡️ {product.warranty_days} hari</p><p className="mt-1 text-[11px] text-emerald-800">Sesuai ketentuan</p></div></div>
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
            {wa ? <a href={buyHref} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center rounded-2xl px-5 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-50">Tanya via WhatsApp</a> : null}
            <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">Jangan transfer di luar instruksi resmi RIKU STORE.</p>
          </div>
        </aside>
      </div>
    </div>      <StoreFooter />
</main>;
}
