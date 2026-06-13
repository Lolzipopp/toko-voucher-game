import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import Pagination from "@/components/admin/pagination";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logServerError } from "@/lib/observability/server-log";

import InventoryClient, {
  type InventoryProduct,
  type InventoryRow,
} from "./inventory-client";

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

const PAGE_SIZE = 100;
const ALLOWED_STATUSES = ["available", "reserved", "disabled", "problem"];

export default async function InventoryPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, admin } = await requireAdmin();
  const selectedStatus = ALLOWED_STATUSES.includes(query.status ?? "")
    ? query.status ?? ""
    : "";
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  await supabase.rpc("repair_expired_stock_reservations");

  let inventoryQuery = supabase
    .from("inventory_accounts")
    .select(
      `id, product_id, status, purchase_cost, supplier, notes, created_at, archived_at, products(name, product_code)`,
      { count: "exact" },
    )
    .not("status", "in", '("sold","archived")')
    .order("created_at", { ascending: false })
    .range(from, to);

  if (selectedStatus) {
    inventoryQuery = inventoryQuery.eq("status", selectedStatus);
  }

  const [productsResult, inventoryResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, product_code, product_type")
      .neq("status", "archived")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    inventoryQuery,
  ]);

  if (productsResult.error || inventoryResult.error) {
    logServerError(
      "admin_inventory_load_failed",
      productsResult.error ?? inventoryResult.error,
    );
    throw new Error("Stok belum dapat dimuat. Silakan coba lagi.");
  }

  const products = (productsResult.data ?? []) as InventoryProduct[];
  const inventory: InventoryRow[] = (inventoryResult.data ?? []).map((item) => ({
    ...item,
    products: Array.isArray(item.products)
      ? item.products[0] ?? null
      : item.products ?? null,
  }));

  return (
    <AdminShell active="inventory" admin={admin}>
      <PageTitle
        eyebrow="Inventory Control"
        title="Manajemen stok"
        description="Masukkan stok massal, pantau akun siap jual, dan perbaiki akun bermasalah. Akun terjual otomatis dipindahkan ke Pesanan."
      />
      <InventoryClient
        products={products}
        inventory={inventory}
        initialStatus={selectedStatus}
      />
      <Pagination
        basePath="/admin/inventory"
        page={page}
        pageSize={PAGE_SIZE}
        total={inventoryResult.count ?? 0}
        params={{ status: selectedStatus || undefined }}
      />
    </AdminShell>
  );
}
