import Link from "next/link";
import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import Pagination from "@/components/admin/pagination";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logServerError } from "@/lib/observability/server-log";

import TestOrderPanel from "./test-order-panel";
import { INTERNAL_TEST_TOOLS_ENABLED } from "@/lib/config/store";

import { formatRupiah } from "@/lib/format/display";
type OrdersPageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
    delivery?: string;
    page?: string;
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
const PAGE_SIZE = 25;

const FILTERS = [
  "all",
  "pending",
  "processing",
  "paid",
  "failed",
  "expired",
  "refunded",
] as const;


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

export default async function AdminOrdersPage({
  searchParams,
}: OrdersPageProps) {
  const query = await searchParams;
  const selectedStatus = FILTERS.includes(
    query.status as (typeof FILTERS)[number],
  )
    ? (query.status as (typeof FILTERS)[number])
    : "all";
  const keyword = (query.q ?? "").trim();
  const selectedDelivery =
    query.delivery === "delivery_failed" ? "delivery_failed" : "all";
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { supabase, admin } = await requireAdmin();

  let ordersQuery = supabase
    .from("orders")
    .select(
      `
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
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (selectedStatus !== "all") {
    ordersQuery = ordersQuery.eq("status", selectedStatus);
  }
  if (selectedDelivery !== "all") {
    ordersQuery = ordersQuery.eq("delivery_status", selectedDelivery);
  }
  if (keyword) {
    const safeKeyword = keyword.replace(/[,%()]/g, " ").trim();
    if (safeKeyword) {
      ordersQuery = ordersQuery.or(
        `order_number.ilike.%${safeKeyword}%,customer_email.ilike.%${safeKeyword}%`,
      );
    }
  }

  async function countForStatus(status: (typeof FILTERS)[number]) {
    let countQuery = supabase
      .from("orders")
      .select("id", { count: "exact", head: true });
    if (status !== "all") countQuery = countQuery.eq("status", status);
    if (selectedDelivery !== "all") {
      countQuery = countQuery.eq("delivery_status", selectedDelivery);
    }
    if (keyword) {
      const safeKeyword = keyword.replace(/[,%()]/g, " ").trim();
      if (safeKeyword) {
        countQuery = countQuery.or(
          `order_number.ilike.%${safeKeyword}%,customer_email.ilike.%${safeKeyword}%`,
        );
      }
    }
    const result = await countQuery;
    return { status, count: result.count ?? 0, error: result.error };
  }

  const [ordersResult, productsResult, inventoryResult, deliveryFailedResult] =
    await Promise.all([
      ordersQuery,
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
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("delivery_status", "delivery_failed"),
    ]);
  const statusCountResults = await Promise.all(
    FILTERS.map((status) => countForStatus(status)),
  );

  const countError = statusCountResults.find((result) => result.error)?.error;
  if (
    ordersResult.error ||
    productsResult.error ||
    inventoryResult.error ||
    countError ||
    deliveryFailedResult.error
  ) {
    logServerError(
      "admin_orders_load_failed",
      ordersResult.error ??
        productsResult.error ??
        inventoryResult.error ??
        countError ?? deliveryFailedResult.error,
    );
    throw new Error("Pesanan belum dapat dimuat. Silakan coba lagi.");
  }

  const stockCounts = (inventoryResult.data ?? []).reduce<
    Record<string, number>
  >((result, row) => {
    result[row.product_id] = (result[row.product_id] ?? 0) + 1;
    return result;
  }, {});

  const testProducts: TestProduct[] = (productsResult.data ?? []).map(
    (product) => ({
      ...product,
      available_stock: stockCounts[product.id] ?? 0,
    }),
  );

  const filteredOrders = (ordersResult.data ?? []) as OrderRow[];
  const totalOrders = ordersResult.count ?? 0;
  const counts = Object.fromEntries(
    statusCountResults.map((result) => [result.status, result.count]),
  ) as Record<string, number>;

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
          {selectedDelivery !== "all" ? (
            <input type="hidden" name="delivery" value={selectedDelivery} />
          ) : null}
          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0b2f21]">
            Cari
          </button>
        </form>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((status) => {
          const selected = selectedStatus === status;
          const count =
            counts[status] ?? 0;
          const params = new URLSearchParams();
          if (status !== "all") params.set("status", status);
          if (query.q) params.set("q", query.q);
          if (selectedDelivery !== "all")
            params.set("delivery", selectedDelivery);
          const href = params.size
            ? `/admin/orders?${params.toString()}`
            : "/admin/orders";

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
              {status === "all" ? "Semua" : status}{" "}
              <span className="ml-1 opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[
          { value: "all", label: "Semua pengiriman" },
          { value: "delivery_failed", label: "Pengiriman gagal" },
        ].map((filter) => {
          const selected = selectedDelivery === filter.value;
          const params = new URLSearchParams();
          if (selectedStatus !== "all") params.set("status", selectedStatus);
          if (filter.value !== "all") params.set("delivery", filter.value);
          if (query.q) params.set("q", query.q);
          const href = params.size
            ? `/admin/orders?${params.toString()}`
            : "/admin/orders";
          const count =
            filter.value === "delivery_failed"
              ? selectedDelivery === "delivery_failed"
                ? totalOrders
                : (deliveryFailedResult.count ?? 0)
              : selectedDelivery === "all"
                ? (counts.all ?? totalOrders)
                : totalOrders;

          return (
            <Link
              key={filter.value}
              href={href}
              className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black transition ${
                selected
                  ? filter.value === "delivery_failed"
                    ? "border-red-700 bg-red-700 text-white"
                    : "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter.label} <span className="ml-1 opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="font-bold text-slate-800">
            Belum ada pesanan yang cocok.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Order akan muncul setelah checkout mulai digunakan.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {filteredOrders.map((order) => {
            const unitCount = (order.order_items ?? []).reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            const reservationExpired =
              order.reservation_expires_at &&
              new Date(order.reservation_expires_at).getTime() <
                SERVER_RENDER_TIME;

            return (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-slate-950">
                        {order.order_number}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badge(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {order.customer_email}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {unitCount} unit · Dibuat {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-lg font-black text-emerald-700">
                      {formatRupiah(order.total_amount)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:justify-end">
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${badge(order.payment_status)}`}
                      >
                        Bayar: {order.payment_status}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${badge(order.delivery_status)}`}
                      >
                        Kirim: {order.delivery_status}
                      </span>
                    </div>
                    {reservationExpired && order.status !== "paid" ? (
                      <p className="mt-2 text-[10px] font-bold text-red-600">
                        Reservasi sudah kedaluwarsa
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <Pagination
        basePath="/admin/orders"
        page={page}
        pageSize={PAGE_SIZE}
        total={totalOrders}
        params={{
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          delivery:
            selectedDelivery !== "all" ? selectedDelivery : undefined,
          q: query.q || undefined,
        }}
      />
    </AdminShell>
  );
}
