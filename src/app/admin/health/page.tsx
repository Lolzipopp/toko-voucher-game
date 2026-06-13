import Link from "next/link";

import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { requireAdmin } from "@/lib/auth/require-admin";
import { repairExpiredReservationsAction, resolveAppErrorsAction } from "./actions";

type HealthMetrics = {
  authorized?: boolean;
  checked_at?: string;
  overdue_active_reservations?: number | string | null;
  expired_orders_not_released?: number | string | null;
  delivery_failed_orders?: number | string | null;
  failed_emails_24h?: number | string | null;
  problem_stock?: number | string | null;
  active_products_without_stock?: number | string | null;
};

type SearchParams = Promise<{ success?: string; error?: string }>;

function metricNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function healthTone(value: number, critical = false) {
  if (value === 0) return "border-emerald-200 bg-emerald-50 text-emerald-950";
  return critical
    ? "border-red-200 bg-red-50 text-red-950"
    : "border-amber-200 bg-amber-50 text-amber-950";
}

export default async function AdminHealthPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, admin } = await requireAdmin();
  const query = await searchParams;
  const [{ data, error }, { data: recentErrors, count: unresolvedErrorCount }] = await Promise.all([
    supabase.rpc("admin_operational_health").single(),
    supabase
      .from("app_error_events")
      .select("id, source, message, pathname, digest, created_at", { count: "exact" })
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (error) {
    throw new Error("Status operasional belum dapat dimuat. Pastikan migration 35 sudah dijalankan.");
  }

  const metrics = (data ?? {}) as HealthMetrics;
  const overdueReservations = metricNumber(metrics.overdue_active_reservations);
  const expiredOrders = metricNumber(metrics.expired_orders_not_released);
  const deliveryFailed = metricNumber(metrics.delivery_failed_orders);
  const failedEmails = metricNumber(metrics.failed_emails_24h);
  const problemStock = metricNumber(metrics.problem_stock);
  const productsWithoutStock = metricNumber(metrics.active_products_without_stock);
  const appErrors = Number(unresolvedErrorCount ?? 0);
  const allHealthy = [overdueReservations, expiredOrders, deliveryFailed, failedEmails, problemStock, appErrors].every((value) => value === 0);

  const cards = [
    {
      label: "Reservasi melewati batas",
      value: overdueReservations,
      detail: "Seharusnya sudah dilepas dan stok kembali tersedia.",
      href: "/admin/inventory?status=reserved",
      critical: true,
    },
    {
      label: "Order kedaluwarsa belum diproses",
      value: expiredOrders,
      detail: "Order pending yang masa pembayarannya sudah habis.",
      href: "/admin/orders?status=pending",
      critical: true,
    },
    {
      label: "Pengiriman gagal",
      value: deliveryFailed,
      detail: "Pembeli dapat sudah membayar tetapi akun belum terkirim.",
      href: "/admin/orders?delivery=delivery_failed",
      critical: true,
    },
    {
      label: "Email gagal 24 jam terakhir",
      value: failedEmails,
      detail: "Arahkan pembeli ke dashboard akun bila email belum masuk.",
      href: "/admin/orders",
      critical: false,
    },
    {
      label: "Stok bermasalah",
      value: problemStock,
      detail: "Akun perlu diperiksa sebelum dijual kembali.",
      href: "/admin/inventory?status=problem",
      critical: false,
    },
    {
      label: "Produk aktif tanpa stok",
      value: productsWithoutStock,
      detail: "Produk tetap boleh tampil sebagai habis, tetapi perlu dipantau.",
      href: "/admin/products",
      critical: false,
    },
  ];

  return (
    <AdminShell active="health" admin={admin}>
      <PageTitle
        eyebrow="Monitoring"
        title="Kesehatan operasional"
        description="Periksa masalah yang dapat menghambat checkout, stok, dan pengiriman akun."
      />

      {query.success ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{query.success}</div> : null}
      {query.error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">{query.error}</div> : null}

      <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${allHealthy ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Status toko</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{allHealthy ? "Tidak ada masalah kritis terdeteksi" : "Ada kondisi yang perlu diperiksa"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Pemeriksaan terakhir: {metrics.checked_at ? new Date(metrics.checked_at).toLocaleString("id-ID") : "baru saja"}.</p>
          </div>
          <form action={repairExpiredReservationsAction}>
            <button type="submit" className="inline-flex w-full items-center justify-center rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0b2f21] sm:w-auto">
              Perbaiki reservasi kedaluwarsa
            </button>
          </form>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${healthTone(card.value, card.critical)}`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-black">{card.label}</p>
              <span className="text-3xl font-black">{card.value}</span>
            </div>
            <p className="mt-4 text-xs leading-5 opacity-75">{card.detail}</p>
          </Link>
        ))}
      </section>


      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Error aplikasi</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">{appErrors} error belum ditandai selesai</h2>
            <p className="mt-1 text-sm text-slate-600">Error dari browser pembeli dicatat tanpa password, token, atau credential akun.</p>
          </div>
          {appErrors > 0 ? (
            <form action={resolveAppErrorsAction}>
              <button type="submit" className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
                Tandai semua sudah diperiksa
              </button>
            </form>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {(recentErrors ?? []).length === 0 ? (
            <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Belum ada error browser yang tercatat.</p>
          ) : (recentErrors ?? []).map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-rose-600">{item.source}</p>
                <time className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString("id-ID")}</time>
              </div>
              <p className="mt-2 break-words text-sm font-semibold text-slate-900">{item.message}</p>
              {item.pathname ? <p className="mt-1 break-all text-xs text-slate-500">Halaman: {item.pathname}</p> : null}
              {item.digest ? <p className="mt-1 break-all text-xs text-slate-400">Kode: {item.digest}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-slate-950">Tindakan saat ada masalah</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <p className="rounded-2xl bg-slate-50 p-4"><strong>Reservasi terlambat:</strong> jalankan tombol perbaikan, lalu pastikan stok kembali available.</p>
          <p className="rounded-2xl bg-slate-50 p-4"><strong>Delivery gagal:</strong> buka order, periksa stok yang terkunci, lalu hubungi pembeli.</p>
          <p className="rounded-2xl bg-slate-50 p-4"><strong>Email gagal:</strong> pembeli tetap dapat melihat akun melalui dashboard setelah login OTP.</p>
          <p className="rounded-2xl bg-slate-50 p-4"><strong>Stok problem:</strong> jangan kembalikan ke available sebelum login akun diverifikasi.</p>
        </div>
      </section>
    </AdminShell>
  );
}
