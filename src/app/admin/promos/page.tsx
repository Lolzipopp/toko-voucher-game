import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import { createPromo, togglePromo } from "./actions";

type Props = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number | null;
  valid_until: string | null;
  is_active: boolean;
};

function rupiah(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PromosPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const [{ data: admin }, { data: promos, error }] = await Promise.all([
    supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single(),
    supabase.from("promo_codes").select("id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count, per_customer_limit, valid_until, is_active").order("created_at", { ascending: false }),
  ]);

  if (!admin?.is_active) redirect("/admin/login");
  if (error) throw new Error(`Gagal mengambil promo: ${error.message}`);

  const field = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

  return (
    <AdminShell active="promos" admin={admin}>
      <PageTitle eyebrow="Growth Tools" title="Promo" description="Buat dan kelola kode diskon tanpa membuka SQL Editor." />

      {query.success ? <Notice type="success">{query.success}</Notice> : null}
      {query.error ? <Notice type="error">{query.error}</Notice> : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-black">Buat promo baru</h2>
        <form action={createPromo} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input name="code" required placeholder="Kode: RIKU10" className={field} />
          <select name="discount_type" className={field} defaultValue="percentage">
            <option value="percentage">Persen</option>
            <option value="fixed_amount">Nominal rupiah</option>
          </select>
          <input name="discount_value" type="number" min="1" step="0.01" required placeholder="Nilai diskon" className={field} />
          <input name="min_order_amount" type="number" min="0" step="1" placeholder="Minimal belanja" className={field} />
          <input name="max_discount_amount" type="number" min="0" step="1" placeholder="Maksimal diskon (opsional)" className={field} />
          <input name="usage_limit" type="number" min="1" step="1" placeholder="Kuota total (opsional)" className={field} />
          <input name="per_customer_limit" type="number" min="1" step="1" placeholder="Batas per email" className={field} />
          <input name="valid_until" type="datetime-local" className={field} />
          <input name="description" placeholder="Deskripsi promo" className={`${field} md:col-span-2 xl:col-span-3`} />
          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">Buat promo</button>
        </form>
      </section>

      <section className="mt-5 space-y-3">
        {(promos as Promo[] ?? []).map((promo) => {
          const expired = promo.valid_until ? new Date(promo.valid_until) <= new Date() : false;
          return (
            <article key={promo.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{promo.code}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${promo.is_active && !expired ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {expired ? "expired" : promo.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{promo.description || "Tanpa deskripsi"}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5">
                      {promo.discount_type === "percentage" ? `${promo.discount_value}%` : rupiah(promo.discount_value)}
                    </span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5">Min. {rupiah(promo.min_order_amount)}</span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5">Dipakai {promo.usage_count}/{promo.usage_limit ?? "∞"}</span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5">Per email {promo.per_customer_limit ?? "∞"}</span>
                  </div>
                </div>

                <form action={togglePromo}>
                  <input type="hidden" name="promo_id" value={promo.id} />
                  <input type="hidden" name="active" value={String(promo.is_active)} />
                  <button className={`rounded-2xl border px-4 py-2.5 text-sm font-black ${promo.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                    {promo.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}

        {(promos ?? []).length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
            Belum ada promo.
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
