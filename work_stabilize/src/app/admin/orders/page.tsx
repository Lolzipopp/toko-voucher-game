import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import TestOrderPanel from "./test-order-panel";
import { INTERNAL_TEST_TOOLS_ENABLED } from "@/lib/config/store";

type OrdersPageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

type TestProduct = {
  id: string;
  name: string;
  product_code: string;
  available_stock: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_status: string;
  reservation_expires_at: string | null;
  created_at: string;
  order_items: { id: string; quantity: number }[] | null;
};

const SERVER_RENDER_TIME: number = new Date().getTime();

const FILTERS = ["all", "pending", "processing", "paid", "failed", "expired", "refunded"] as const;

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    paid: "bg-emerald-100 text-emerald-800",
    delivered: "bg-emerald-100 text-emerald-800",
    delivery_failed: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
    expired: "bg-slate-200 text-slate-600",
    refunded: "bg-purple-100 text-purple-800",
  };

  return map[status] ?? "bg-slate-100 text-slate-600";
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const query = await searchParams;
  const selectedStatus = FILTERS.includes(query.status as (typeof FILTERS)[number])
    ? (query.status as (typeof FILTERS)[number])
    : "all";
  const keyword = (query.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) redirect("/admin/login");

  const [ordersResult, productsResult, inventoryResult] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_email,
        total_amount,
        status,
        payment_status,
        delivery_status,
        reservation_expires_at,
        created_at,
        order_items(id, quantity)
      `)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("products")
      .select("id, name, product_code")
      .eq("status", "active")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_accounts")
      .select("product_id")
      .eq("status", "available")
      .is("archived_at", null),
  ]);

  if (ordersResult.error) {
    throw new Error(`Gagal mengambil pesanan: ${ordersResult.error.message}`);
  }

  if (productsResult.error) {
    throw new Error(`Gagal mengambil produk test: ${productsResult.error.message}`);
  }

  if (inventoryResult.error) {
    throw new Error(`Gagal menghitung stok test: ${inventoryResult.error.message}`);
  }

  const stockCounts = (inventoryResult.data ?? []).reduce<Record<string, number>>(
    (result, row) => {
      result[row.product_id] = (result[row.product_id] ?? 0) + 1;
      return result;
    },
    {},
  );

  const testProducts: TestProduct[] = (productsResult.data ?? []).map((product) => ({
    ...product,
    available_stock: stockCounts[product.id] ?? 0,
  }));

  const allOrders = (ordersResult.data ?? []) as OrderRow[];
  const filteredOrders = allOrders.filter((order) => {
    const statusMatch = selectedStatus === "all" || order.status === selectedStatus;
    const keywordMatch =
      !keyword ||
      order.order_number.toLowerCase().includes(keyword) ||
      order.customer_email.toLowerCase().includes(keyword);

    return statusMatch && keywordMatch;
  });

  const counts = allOrders.reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, {});

  return (
    <AdminShell active="orders" admin={admin}>
      <PageTitle
        eyebrow="Operasional Pesanan"
        title="Pesanan"
        description="Pantau order, pembayaran, stok yang ditahan, dan status pengiriman dari satu tempat."
      />

      {INTERNAL_TEST_TOOLS_ENABLED ? (
        <TestOrderPanel products={testProducts} />
      ) : null}

      <section className="mb-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <form className="flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Cari nomor order atau email pembeli"
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
          <input type="hidden" name="status" value={selectedStatus} />
          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0b2f21]">
            Cari
          </button>
        </form>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((status) => {
          const selected = selectedStatus === status;
          const count = status === "all" ? allOrders.length : counts[status] ?? 0;
          const params = new URLSearchParams();
          if (status !== "all") params.set("status", status);
          if (query.q) params.set("q", query.q);
          const href = params.size ? `/admin/orders?${params.toString()}` : "/admin/orders";

          return (
            <Link
              key={status}
              href={href}
              className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black capitalize transition ${
                selected
                  ? "border-[#103d2b] bg-[#103d2b] text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {status === "all" ? "Semua" : status} <span className="ml-1 opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-bold text-slate-800">Belum ada pesanan yang cocok.</p>
          <p className="mt-2 text-sm text-slate-400">Order akan muncul setelah checkout mulai digunakan.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {filteredOrders.map((order) => {
            const unitCount = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
            const reservationExpired =
              order.reservation_expires_at && new Date(order.reservation_expires_at).getTime() < SERVER_RENDER_TIME;

            return (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-slate-950">{order.order_number}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badge(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{order.customer_email}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {unitCount} unit · Dibuat {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-lg font-black text-emerald-700">{formatRupiah(order.total_amount)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:justify-end">
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${badge(order.payment_status)}`}>
                        Bayar: {order.payment_status}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${badge(order.delivery_status)}`}>
                        Kirim: {order.delivery_status}
                      </span>
                    </div>
                    {reservationExpired && order.status !== "paid" ? (
                      <p className="mt-2 text-[10px] font-bold text-red-600">Reservasi sudah kedaluwarsa</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
