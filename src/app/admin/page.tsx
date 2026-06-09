import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single();
  if (!admin?.is_active) redirect("/admin/login");

  const [products, available, reserved, problem, pending, revenue] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active").is("archived_at", null),
    supabase.from("inventory_accounts").select("id", { count: "exact", head: true }).eq("status", "available").is("archived_at", null),
    supabase.from("inventory_accounts").select("id", { count: "exact", head: true }).eq("status", "reserved").is("archived_at", null),
    supabase.from("inventory_accounts").select("id", { count: "exact", head: true }).eq("status", "problem").is("archived_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
  ]);

  const paidRevenue = (revenue.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const stats = [
    { label: "Produk aktif", value: products.count ?? 0, hint: "Sedang tampil untuk penjualan", href: "/admin/products", tone: "emerald" },
    { label: "Stok siap jual", value: available.count ?? 0, hint: "Akun available", href: "/admin/inventory?status=available", tone: "green" },
    { label: "Stok reserved", value: reserved.count ?? 0, hint: "Sedang dikunci checkout", href: "/admin/inventory?status=reserved", tone: "amber" },
    { label: "Stok problem", value: problem.count ?? 0, hint: "Butuh pemeriksaan", href: "/admin/inventory?status=problem", tone: "red" },
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

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-3xl bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-7">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Keuangan & order</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div><p className="text-sm text-white/55">Omzet order paid</p><p className="mt-2 text-3xl font-black">{formatRupiah(paidRevenue)}</p></div>
            <div><p className="text-sm text-white/55">Order pending</p><p className="mt-2 text-3xl font-black">{pending.count ?? 0}</p></div>
          </div>
          <p className="mt-6 text-xs leading-5 text-white/45">Data dihitung langsung dari database. Modul order lengkap akan diaktifkan pada tahap berikutnya.</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Aksi cepat</p>
          <div className="mt-4 space-y-3">
            <Link href="/admin/products/new" className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-4 font-bold text-emerald-950 transition hover:bg-emerald-100"><span>Tambah produk baru</span><span>→</span></Link>
            <Link href="/admin/inventory" className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 font-bold text-slate-800 transition hover:bg-slate-100"><span>Input stok massal</span><span>→</span></Link>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
