import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import ProductForm from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";

import { createProduct } from "../actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewProductPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single();
  if (!admin?.is_active) redirect("/admin/login");
  const { data: games, error } = await supabase.from("games").select("id, name").eq("is_active", true).order("sort_order");
  if (error) throw new Error(`Gagal mengambil daftar game: ${error.message}`);

  return (
    <AdminShell active="products" admin={admin}>
      <div className="mx-auto max-w-4xl">
        <PageTitle eyebrow="New Catalog Item" title="Buat produk baru" description="Buat produk massal atau unik. Stok akun ditambahkan setelah produk tersimpan." />
        {query.error ? <Notice type="error">{query.error}</Notice> : null}
        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
          {(games ?? []).length ? <ProductForm games={games ?? []} action={createProduct} submitLabel="Simpan produk" /> : <Notice type="error">Tidak ada game aktif.</Notice>}
        </section>
      </div>
    </AdminShell>
  );
}
