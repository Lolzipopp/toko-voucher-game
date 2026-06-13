import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import InventoryClient, { type InventoryProduct, type InventoryRow } from "./inventory-client";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function InventoryPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single();
  if (!admin?.is_active) redirect("/admin/login");

  await supabase.rpc("repair_expired_stock_reservations");

  const [{ data: productsData, error: productsError }, { data: inventoryData, error: inventoryError }] = await Promise.all([
    supabase.from("products").select("id, name, product_code, product_type").neq("status", "archived").is("archived_at", null).order("name", { ascending: true }),
    supabase
      .from("inventory_accounts")
      .select(`id, product_id, status, purchase_cost, supplier, notes, created_at, archived_at, products(name, product_code)`)
      .not("status", "in", '("sold","archived")')
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (productsError) throw new Error(`Gagal mengambil produk: ${productsError.message}`);
  if (inventoryError) throw new Error(`Gagal mengambil stok: ${inventoryError.message}`);

  const products = (productsData ?? []) as InventoryProduct[];

  const inventory: InventoryRow[] = (inventoryData ?? []).map((item) => ({
    ...item,
    products: Array.isArray(item.products)
      ? item.products[0] ?? null
      : item.products ?? null,
  }));

  return (
    <AdminShell active="inventory" admin={admin}>
      <PageTitle eyebrow="Inventory Control" title="Manajemen stok" description="Masukkan stok massal, pantau akun siap jual, dan perbaiki akun bermasalah. Akun terjual otomatis dipindahkan ke Pesanan." />
      <InventoryClient products={products} inventory={inventory} initialStatus={query.status ?? ""} />
    </AdminShell>
  );
}
