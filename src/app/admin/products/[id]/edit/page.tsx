import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import ImageCropUpload from "@/components/admin/image-crop-upload";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import ProductForm from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";

import { deleteProductImage, setPrimaryProductImage, updateProduct, uploadProductImage } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> };
type Attr = { attribute_key: string; attribute_value: string; display_order: number };
type ProductImage = { id: string; storage_path: string; alt_text: string | null; is_primary: boolean; sort_order: number };

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single();
  if (!admin?.is_active) redirect("/admin/login");

  const [{ data: product, error }, { data: games }] = await Promise.all([
    supabase.from("products").select(`id, game_id, name, product_code, product_type, price_normal, price_promo, promo_ends_at, description, warranty_days, is_popular, sort_order, allow_negotiation, negotiation_min_price, status, archived_at, product_attributes(attribute_key, attribute_value, display_order), product_images(id, storage_path, alt_text, is_primary, sort_order)`).eq("id", id).single(),
    supabase.from("games").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  if (error || !product) notFound();
  if (product.archived_at || product.status === "archived") redirect(`/admin/products?view=archived&error=${encodeURIComponent("Produk arsip harus dipulihkan sebelum diedit.")}`);

  const attributes = ([...(product.product_attributes ?? [])] as Attr[]).sort((a,b) => a.display_order-b.display_order).map((a) => `${a.attribute_key}=${a.attribute_value}`).join("\n");
  const action = updateProduct.bind(null, product.id);

  return (
    <AdminShell active="products" admin={admin}>
      <div className="mx-auto max-w-4xl">
        <PageTitle eyebrow="Edit Catalog Item" title="Edit produk" description="Perubahan produk akan disimpan dan dicatat ke audit log." />
        {query.success ? <Notice type="success">{query.success}</Notice> : null}
        {query.error ? <Notice type="error">{query.error}</Notice> : null}
        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          <ProductForm games={games ?? []} action={action} submitLabel="Simpan perubahan" defaults={{ gameId: product.game_id, name: product.name, productCode: product.product_code, productType: product.product_type, priceNormal: product.price_normal, status: product.status, attributes, description: product.description ?? "", pricePromo: product.price_promo, promoEndsAt: product.promo_ends_at, warrantyDays: product.warranty_days, isPopular: product.is_popular, sortOrder: product.sort_order, allowNegotiation: product.allow_negotiation, negotiationMinPrice: product.negotiation_min_price }} />
        </section>

        <section className="mt-5 rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-black">Gambar produk</h2>
          <p className="mt-1 text-sm text-slate-500">Maksimal 2 MB per gambar. Gunakan rasio 2:1 dengan ukuran 1600×800 px agar foto tampil penuh di slider produk.</p>

          <form action={uploadProductImage.bind(null, product.id)} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="sm:col-span-2">
              <ImageCropUpload
                required
                label="Pilih dan crop foto produk"
                maxSizeMb={2}
                helpText="Hasil upload otomatis berukuran 1600 × 800 px dalam format WebP."
              />
            </div>
            <input name="alt_text" placeholder="Teks alternatif gambar" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
            <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">Upload gambar</button>
          </form>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([...(product.product_images ?? [])] as ProductImage[]).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order).map((image) => {
              const publicUrl = supabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl;
              return (
                <article key={image.id} className="overflow-hidden rounded-2xl border border-slate-200">
                  <Image src={publicUrl} alt={image.alt_text || product.name} width={1600} height={800} unoptimized className="aspect-[2/1] w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${image.is_primary ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {image.is_primary ? "Utama" : "Galeri"}
                    </span>
                    <div className="flex gap-2">
                      {!image.is_primary ? (
                        <form action={setPrimaryProductImage}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="image_id" value={image.id} />
                          <button className="text-xs font-bold text-emerald-700">Jadikan utama</button>
                        </form>
                      ) : null}
                      <form action={deleteProductImage}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="image_id" value={image.id} />
                        <button className="text-xs font-bold text-red-600">Hapus</button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

      </div>
    </AdminShell>
  );
}
