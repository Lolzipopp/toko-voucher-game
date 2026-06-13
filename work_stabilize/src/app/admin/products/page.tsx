import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import { archiveProduct, restoreProduct } from "./actions";

type ProductsPageProps = { searchParams: Promise<{ success?: string; error?: string; view?: string }> };
type ProductAttribute = { attribute_key: string; attribute_value: string; display_order: number };
type Product = {
  id: string; name: string; product_code: string; product_type: string; price_normal: number; status: string; archived_at: string | null;
  games: { name: string }[] | null; product_attributes: ProductAttribute[];
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
function badge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800", draft: "bg-amber-100 text-amber-800", preorder: "bg-blue-100 text-blue-800",
    out_of_stock: "bg-red-100 text-red-700", archived: "bg-slate-200 text-slate-600",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const query = await searchParams;
  const view = query.view === "archived" ? "archived" : "active";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single();
  if (!admin?.is_active) redirect("/admin/login");

  const { data, error } = await supabase.from("products").select(`
    id, name, product_code, product_type, price_normal, status, archived_at,
    games(name), product_attributes(attribute_key, attribute_value, display_order)
  `).order("created_at", { ascending: false });
  if (error) throw new Error(`Gagal mengambil produk: ${error.message}`);

  const allProducts = (data ?? []) as Product[];
  const activeProducts = allProducts.filter((p) => p.status !== "archived" && !p.archived_at);
  const archivedProducts = allProducts.filter((p) => p.status === "archived" || Boolean(p.archived_at));
  const products = view === "archived" ? archivedProducts : activeProducts;

  return (
    <AdminShell active="products" admin={admin}>
      <PageTitle eyebrow="Catalog Control" title="Manajemen produk" description="Atur produk massal dan unik, harga, atribut, status, serta arsip tanpa menghapus riwayat." action={
        <Link href="/admin/products/new" className="inline-flex items-center justify-center rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#0b2f21]">+ Produk baru</Link>
      } />

      {query.success ? <Notice type="success">{query.success}</Notice> : null}
      {query.error ? <Notice type="error">{query.error}</Notice> : null}

      <div className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <Link href="/admin/products" className={`rounded-xl px-4 py-2 text-sm font-bold transition ${view === "active" ? "bg-[#103d2b] text-white" : "text-slate-500 hover:bg-slate-50"}`}>Aktif <span className="ml-1 opacity-60">{activeProducts.length}</span></Link>
        <Link href="/admin/products?view=archived" className={`rounded-xl px-4 py-2 text-sm font-bold transition ${view === "archived" ? "bg-[#103d2b] text-white" : "text-slate-500 hover:bg-slate-50"}`}>Arsip <span className="ml-1 opacity-60">{archivedProducts.length}</span></Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><p className="font-bold text-slate-800">Belum ada produk {view === "archived" ? "di arsip" : "aktif"}.</p><p className="mt-2 text-sm text-slate-400">Produk akan muncul di sini setelah tersedia.</p></div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {products.map((product) => {
            const attrs = [...(product.product_attributes ?? [])].sort((a,b) => a.display_order-b.display_order).slice(0,4);
            const gameName = product.games?.[0]?.name ?? "-";
            const archived = product.status === "archived" || Boolean(product.archived_at);
            return (
              <article key={product.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-black text-slate-950">{product.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badge(product.status)}`}>{product.status}</span></div><p className="mt-1 text-xs font-semibold text-slate-400">{gameName} · {product.product_code} · {product.product_type}</p></div>
                  <p className="shrink-0 text-lg font-black text-emerald-700">{formatRupiah(product.price_normal)}</p>
                </div>

                {attrs.length ? <div className="mt-4 flex flex-wrap gap-2">{attrs.map((attr) => <span key={`${product.id}-${attr.attribute_key}`} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600"><b>{attr.attribute_key}</b>: {attr.attribute_value}</span>)}</div> : <p className="mt-4 text-xs text-slate-400">Belum ada atribut.</p>}

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">ID {product.id.slice(0,8)}</p>
                  <div className="flex gap-2">
                    {!archived ? <>
                      <Link href={`/admin/products/${product.id}/edit`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Edit</Link>
                      <form action={archiveProduct}><input type="hidden" name="product_id" value={product.id}/><button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50">Arsipkan</button></form>
                    </> : <form action={restoreProduct}><input type="hidden" name="product_id" value={product.id}/><button className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700">Pulihkan ke draft</button></form>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
