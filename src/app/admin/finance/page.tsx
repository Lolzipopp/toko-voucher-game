import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import FinanceTabs from "./finance-tabs";

import { formatRupiah } from "@/lib/format/display";
type Props = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

type PaymentRow = {
  id: string;
  provider: string;
  payment_method: string;
  external_id: string | null;
  amount: number;
  fee: number;
  status: string;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  orders:
    | {
        id: string;
        order_number: string;
        customer_email: string;
      }
    | {
        id: string;
        order_number: string;
        customer_email: string;
      }[]
    | null;
};

type ProviderEvent = {
  id: string;
  provider: string;
  external_event_id: string;
  event_type: string;
  verification_status: string;
  processing_status: string;
  error_message: string | null;
  received_at: string;
};

const STATUSES = ["all", "pending", "processing", "paid", "failed", "expired", "refunded"] as const;


function date(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-700",
    expired: "bg-slate-200 text-slate-600",
    refunded: "bg-purple-100 text-purple-800",
    verified: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-700",
    processed: "bg-emerald-100 text-emerald-800",
    received: "bg-blue-100 text-blue-800",
    ignored: "bg-slate-100 text-slate-600",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

export default async function FinancePage({ searchParams }: Props) {
  const query = await searchParams;
  const selectedStatus = STATUSES.includes(
    query.status as (typeof STATUSES)[number],
  )
    ? (query.status as (typeof STATUSES)[number])
    : "all";
  const keyword = (query.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const [{ data: admin }, paymentsResult, eventsResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("full_name, email, role, is_active")
      .eq("id", user.id)
      .single(),
    supabase
      .from("payments")
      .select(`
        id,
        provider,
        payment_method,
        external_id,
        amount,
        fee,
        status,
        paid_at,
        expired_at,
        created_at,
        orders (
          id,
          order_number,
          customer_email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("payment_provider_events")
      .select(`
        id,
        provider,
        external_event_id,
        event_type,
        verification_status,
        processing_status,
        error_message,
        received_at
      `)
      .order("received_at", { ascending: false })
      .limit(30),
  ]);

  if (!admin?.is_active) redirect("/admin/login");
  if (paymentsResult.error) {
    throw new Error(`Gagal mengambil pembayaran: ${paymentsResult.error.message}`);
  }
  if (eventsResult.error) {
    throw new Error(`Gagal mengambil event pembayaran: ${eventsResult.error.message}`);
  }

  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const events = (eventsResult.data ?? []) as ProviderEvent[];

  const filtered = payments.filter((payment) => {
    const order = Array.isArray(payment.orders)
      ? payment.orders[0]
      : payment.orders;

    const statusMatch =
      selectedStatus === "all" || payment.status === selectedStatus;
    const keywordMatch =
      !keyword ||
      payment.provider.toLowerCase().includes(keyword) ||
      payment.payment_method.toLowerCase().includes(keyword) ||
      (payment.external_id ?? "").toLowerCase().includes(keyword) ||
      (order?.order_number ?? "").toLowerCase().includes(keyword) ||
      (order?.customer_email ?? "").toLowerCase().includes(keyword);

    return statusMatch && keywordMatch;
  });

  const totalPaid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  const totalFees = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + Number(payment.fee), 0);

  return (
    <AdminShell active="finance" admin={admin}>
      <PageTitle
        eyebrow="Keuangan"
        title="Pusat Pembayaran"
        description="Pantau transaksi, biaya gateway, dan callback pembayaran dari satu halaman."
      />

      <FinanceTabs active="payments" />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total transaksi", String(payments.length)],
          ["Pembayaran berhasil", String(payments.filter((item) => item.status === "paid").length)],
          ["Nominal berhasil", formatRupiah(totalPaid)],
          ["Total biaya", formatRupiah(totalFees)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Cari order, email, provider, atau ID transaksi"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

          <select
            name="status"
            defaultValue={selectedStatus}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "Semua status" : status}
              </option>
            ))}
          </select>

          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">
            Filter
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {filtered.map((payment) => {
          const order = Array.isArray(payment.orders)
            ? payment.orders[0]
            : payment.orders;

          return (
            <article
              key={payment.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-950">
                      {order?.order_number ?? "Tanpa order"}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                        payment.status,
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {order?.customer_email ?? "-"}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {payment.provider} · {payment.payment_method} ·{" "}
                    {payment.external_id ?? "ID gateway belum ada"}
                  </p>
                </div>

                <div className="shrink-0 lg:text-right">
                  <p className="text-lg font-black text-emerald-700">
                    {formatRupiah(payment.amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Biaya {formatRupiah(payment.fee)} · {date(payment.paid_at ?? payment.created_at)}
                  </p>

                  {order ? (
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="mt-3 inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                    >
                      Buka order
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
            Tidak ada pembayaran yang cocok.
          </div>
        ) : null}
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Webhook Inbox
            </p>
            <h2 className="mt-2 text-lg font-black text-slate-950">
              Event gateway terbaru
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Event ID yang sama hanya disimpan sekali.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center"
            >
              <div>
                <p className="text-sm font-black text-slate-900">
                  {event.provider} · {event.event_type}
                </p>
                <p className="mt-1 break-all text-xs text-slate-400">
                  {event.external_event_id} · {date(event.received_at)}
                </p>
                {event.error_message ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {event.error_message}
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                    event.verification_status,
                  )}`}
                >
                  {event.verification_status}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                    event.processing_status,
                  )}`}
                >
                  {event.processing_status}
                </span>
              </div>
            </div>
          ))}

          {events.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-400">
              Belum ada webhook gateway. Ini normal sebelum Midtrans terhubung.
            </p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
