import { notFound, redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import ProductForm from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";

import { updateProduct } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };
type Attr = { attribute_key: string; attribute_value: string; display_order: number };

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single();
  if (!admin?.is_active) redirect("/admin/login");

  const [{ data: product, error }, { data: games }] = await Promise.all([
    supabase.from("products").select(`id, game_id, name, product_code, product_type, price_normal, status, archived_at, product_attributes(attribute_key, attribute_value, display_order)`).eq("id", id).single(),
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
        {query.error ? <Notice type="error">{query.error}</Notice> : null}
        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          <ProductForm games={games ?? []} action={action} submitLabel="Simpan perubahan" defaults={{ gameId: product.game_id, name: product.name, productCode: product.product_code, productType: product.product_type, priceNormal: product.price_normal, status: product.status, attributes }} />
        </section>
      </div>
    </AdminShell>
  );
}
