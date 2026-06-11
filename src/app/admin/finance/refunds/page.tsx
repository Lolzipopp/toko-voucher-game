import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import FinanceTabs from "../finance-tabs";
import { createRefundRequest, reviewRefundRequest } from "./actions";

type Props = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    status?: string;
  }>;
};

type PaidOrder = {
  id: string;
  order_number: string;
  customer_email: string;
  total_amount: number;
};

type RefundRow = {
  id: string;
  requested_amount: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  provider_refund_id: string | null;
  requested_at: string;
  reviewed_at: string | null;
  processed_at: string | null;
  orders:
    | {
        id: string;
        order_number: string;
        customer_email: string;
        total_amount: number;
      }
    | {
        id: string;
        order_number: string;
        customer_email: string;
        total_amount: number;
      }[]
    | null;
};

const FILTERS = [
  "all",
  "requested",
  "approved",
  "rejected",
  "processing",
  "processed",
  "failed",
  "cancelled",
] as const;

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    requested: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-700",
    processing: "bg-blue-100 text-blue-800",
    processed: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-slate-200 text-slate-600",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

export default async function RefundPage({ searchParams }: Props) {
  const query = await searchParams;
  const selected = FILTERS.includes(
    query.status as (typeof FILTERS)[number],
  )
    ? (query.status as (typeof FILTERS)[number])
    : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const [{ data: admin }, ordersResult, refundsResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("full_name, email, role, is_active")
      .eq("id", user.id)
      .single(),
    supabase
      .from("orders")
      .select("id, order_number, customer_email, total_amount")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("refund_requests")
      .select(`
        id,
        requested_amount,
        reason,
        status,
        admin_notes,
        provider_refund_id,
        requested_at,
        reviewed_at,
        processed_at,
        orders (
          id,
          order_number,
          customer_email,
          total_amount
        )
      `)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (!admin?.is_active) redirect("/admin/login");
  if (ordersResult.error) {
    throw new Error(`Gagal mengambil order paid: ${ordersResult.error.message}`);
  }
  if (refundsResult.error) {
    throw new Error(`Gagal mengambil refund: ${refundsResult.error.message}`);
  }

  const paidOrders = (ordersResult.data ?? []) as PaidOrder[];
  const refunds = (refundsResult.data ?? []) as RefundRow[];
  const filtered =
    selected === "all"
      ? refunds
      : refunds.filter((refund) => refund.status === selected);

  return (
    <AdminShell active="finance" admin={admin}>
      <PageTitle
        eyebrow="Keuangan"
        title="Refund"
        description="Catat, tinjau, dan lacak refund. Pengiriman uang masih dilakukan manual sampai gateway aktif."
      />

      <FinanceTabs active="refunds" />

      {query.success ? <Notice type="success">{query.success}</Notice> : null}
      {query.error ? <Notice type="error">{query.error}</Notice> : null}

      <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-slate-950">
          Buat permintaan refund
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ini hanya pencatatan dan persetujuan. Uang belum dikirim otomatis.
        </p>

        <form
          action={createRefundRequest}
          className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_.7fr_1.5fr_auto]"
        >
          <select
            name="order_id"
            required
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Pilih order paid</option>
            {paidOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number} · {order.customer_email} ·{" "}
                {rupiah(order.total_amount)}
              </option>
            ))}
          </select>

          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            placeholder="Nominal"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          <input
            name="reason"
            required
            placeholder="Alasan refund"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">
            Buat refund
          </button>
        </form>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map((status) => (
          <Link
            key={status}
            href={
              status === "all"
                ? "/admin/finance/refunds"
                : `/admin/finance/refunds?status=${status}`
            }
            className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black capitalize ${
              selected === status
                ? "border-[#103d2b] bg-[#103d2b] text-white"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            {status === "all" ? "Semua" : status}
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        {filtered.map((refund) => {
          const order = Array.isArray(refund.orders)
            ? refund.orders[0]
            : refund.orders;

          return (
            <article
              key={refund.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-950">
                      {order?.order_number ?? "Order tidak ditemukan"}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                        refund.status,
                      )}`}
                    >
                      {refund.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {order?.customer_email ?? "-"}
                  </p>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {refund.reason}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Dibuat {date(refund.requested_at)}
                    {refund.reviewed_at
                      ? ` · Ditinjau ${date(refund.reviewed_at)}`
                      : ""}
                  </p>

                  {refund.admin_notes ? (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Catatan: {refund.admin_notes}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 xl:text-right">
                  <p className="text-xl font-black text-emerald-700">
                    {rupiah(refund.requested_amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Total order {rupiah(order?.total_amount ?? 0)}
                  </p>

                  {refund.status === "requested" ? (
                    <div className="mt-4 grid gap-2">
                      <form action={reviewRefundRequest}>
                        <input type="hidden" name="refund_id" value={refund.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <input
                          name="admin_notes"
                          placeholder="Catatan persetujuan"
                          className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <button className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white">
                          Setujui
                        </button>
                      </form>

                      <form action={reviewRefundRequest}>
                        <input type="hidden" name="refund_id" value={refund.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <input
                          name="admin_notes"
                          required
                          placeholder="Alasan penolakan"
                          className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <button className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-xs font-black text-red-600">
                          Tolak
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
            Belum ada refund dengan status ini.
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
