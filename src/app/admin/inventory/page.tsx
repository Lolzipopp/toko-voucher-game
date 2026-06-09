import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import InventoryClient, {
  type InventoryProduct,
  type InventoryRow,
} from "./inventory-client";

export default async function InventoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) {
    redirect("/admin/login");
  }

  const [{ data: productsData, error: productsError }, { data: inventoryData, error: inventoryError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, product_code, product_type")
        .neq("status", "archived")
        .is("archived_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("inventory_accounts")
        .select(`
          id,
          product_id,
          status,
          purchase_cost,
          supplier,
          notes,
          created_at,
          archived_at,
          products (
            name,
            product_code
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  if (productsError) {
    throw new Error(`Gagal mengambil produk: ${productsError.message}`);
  }

  if (inventoryError) {
    throw new Error(`Gagal mengambil stok: ${inventoryError.message}`);
  }

  const products = (productsData ?? []) as InventoryProduct[];
  const inventory = (inventoryData ?? []) as InventoryRow[];

  return (
    <main className="min-h-screen bg-green-50">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">
              RIKU STORE
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {admin.full_name || admin.email} · {admin.role}
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-green-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
          >
            Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto">
          <Link
            href="/admin"
            className="rounded-xl border border-green-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/products"
            className="rounded-xl border border-green-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Produk
          </Link>

          <Link
            href="/admin/inventory"
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Stok
          </Link>
        </nav>

        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">
            Manajemen Stok
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Stok akun
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Username dan password tidak pernah ditampilkan di browser.
          </p>
        </div>

        <InventoryClient products={products} inventory={inventory} />
      </div>
    </main>
  );
}
