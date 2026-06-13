import Link from "next/link";
import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { requireAdmin } from "@/lib/auth/require-admin";

import { formatRupiah } from "@/lib/format/display";
type DashboardMetrics = {
  active_products: number | string | null;
  available_stock: number | string | null;
  reserved_stock: number | string | null;
  problem_stock: number | string | null;
  pending_orders: number | string | null;
  delivery_failed_orders: number | string | null;
  paid_revenue: number | string | null;
};


export default async function AdminPage() {
  const { supabase, admin } = await requireAdmin();

  const [metricsResult, recentDeliveryFailed] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics").single(),
    supabase
      .from("orders")
      .select("id, order_number, customer_email, total_amount, updated_at")
      .eq("delivery_status", "delivery_failed")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  if (metricsResult.error) {
    throw new Error("Ringkasan dashboard belum dapat dimuat. Pastikan migration terbaru sudah dijalankan.");
  }

  const metrics: DashboardMetrics = (metricsResult.data as DashboardMetrics | null) ?? {
    active_products: 0,
    available_stock: 0,
    reserved_stock: 0,
    problem_stock: 0,
    pending_orders: 0,
    delivery_failed_orders: 0,
    paid_revenue: 0,
  };

  const paidRevenue = Number(metrics.paid_revenue ?? 0);
  const stats = [
    { label: "Produk aktif", value: Number(metrics.active_products ?? 0), hint: "Sedang tampil untuk penjualan", href: "/admin/products", tone: "emerald" },
    { label: "Stok siap jual", value: Number(metrics.available_stock ?? 0), hint: "Akun available", href: "/admin/inventory?status=available", tone: "green" },
    { label: "Stok reserved", value: Number(metrics.reserved_stock ?? 0), hint: "Sedang dikunci checkout", href: "/admin/inventory?status=reserved", tone: "amber" },
    { label: "Stok problem", value: Number(metrics.problem_stock ?? 0), hint: "Butuh pemeriksaan", href: "/admin/inventory?status=problem", tone: "red" },
  ];

  return (
    <AdminShell active="dashboard" admin={admin}>
      <PageTitle eyebrow="Overview" title="Selamat datang kembali" description="Pantau kondisi toko dan akses pekerjaan penting dari satu tempat." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5">
            <div className="flex items-start justify-between"><p className="text-xs font-bold text-slate-500">{stat.label}</p><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-50" /></div>
            <p className="mt-5 text-4xl font-black tracking-tight text-slate-950">{stat.value}</p>
            <p className="mt-2 text-xs text-slate-400">{stat.hint}</p>
          </Link>
        ))}
      </section>


      {Number(metrics.delivery_failed_orders ?? 0) > 0 ? (
        <section className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-700">Perlu tindakan segera</p>
              <h2 className="mt-2 text-xl font-black text-red-950">{Number(metrics.delivery_failed_orders ?? 0)} pengiriman akun gagal</h2>
              <p className="mt-1 text-sm leading-6 text-red-800">Pembayaran dapat sudah masuk, tetapi pembeli belum menerima akun. Periksa pesanan ini sebelum memproses order lain.</p>
            </div>
            <Link href="/admin/orders?delivery=delivery_failed" className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800">Buka pesanan gagal</Link>
          </div>
          {(recentDeliveryFailed.data ?? []).length > 0 ? (
            <div className="mt-5 grid gap-2">
              {(recentDeliveryFailed.data ?? []).map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex flex-col gap-1 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm transition hover:border-red-400 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-black text-slate-950">{order.order_number}</span>
                  <span className="text-slate-600">{order.customer_email}</span>
                  <span className="font-bold text-red-800">{formatRupiah(Number(order.total_amount ?? 0))}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-3xl bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-7">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Keuangan & order</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div><p className="text-sm text-white/55">Omzet order paid</p><p className="mt-2 text-3xl font-black">{formatRupiah(paidRevenue)}</p></div>
            <div><p className="text-sm text-white/55">Order pending</p><p className="mt-2 text-3xl font-black">{Number(metrics.pending_orders ?? 0)}</p></div>
          </div>
          <p className="mt-6 text-xs leading-5 text-white/45">Data dihitung langsung dari database. Buka modul Pesanan untuk melihat rincian dan status setiap order.</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Aksi cepat</p>
          <div className="mt-4 space-y-3">
            <Link href="/admin/products/new" className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-4 font-bold text-emerald-950 transition hover:bg-emerald-100"><span>Tambah produk baru</span><span>→</span></Link>
            <Link href="/admin/inventory" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 font-bold text-slate-800 transition hover:bg-slate-100"><span>Input stok massal</span><span>→</span></Link>
            <Link href="/admin/orders" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 font-bold text-slate-800 transition hover:bg-slate-100"><span>Lihat pesanan</span><span>→</span></Link>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
