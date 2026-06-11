import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import { updateStoreSettings } from "./actions";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

type Settings = {
  store_name: string;
  store_tagline: string;
  support_email: string | null;
  whatsapp_number: string | null;
  payment_window_minutes: number;
  default_warranty_days: number;
  credential_visibility_days: number;
};

export default async function SettingsPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [{ data: admin }, { data, error }] = await Promise.all([
    supabase.from("admin_users").select("full_name, email, role, is_active").eq("id", user.id).single(),
    supabase.rpc("get_public_store_settings"),
  ]);

  if (!admin?.is_active) redirect("/admin/login");
  if (error) throw new Error(`Gagal mengambil pengaturan: ${error.message}`);
  const settings = data as Settings;
  const field = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

  return (
    <AdminShell active="settings" admin={admin}>
      <PageTitle eyebrow="Pengaturan" title="Pengaturan Toko" description="Ubah identitas, kontak bantuan, dan aturan utama toko tanpa mengedit kode." />
      {query.success ? <Notice type="success">{query.success}</Notice> : null}
      {query.error ? <Notice type="error">{query.error}</Notice> : null}

      <form action={updateStoreSettings} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Nama toko</label><input name="store_name" required defaultValue={settings.store_name} className={field}/></div>
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Teks singkat toko</label><input name="store_tagline" defaultValue={settings.store_tagline} className={field}/></div>
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Email bantuan</label><input name="support_email" type="email" defaultValue={settings.support_email ?? ""} placeholder="support@rikustore.com" className={field}/></div>
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Nomor WhatsApp</label><input name="whatsapp_number" defaultValue={settings.whatsapp_number ?? ""} placeholder="6281234567890" className={field}/><p className="mt-1 text-[11px] text-slate-400">Boleh diawali 08 atau 62. Sistem akan merapikannya.</p></div>
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Batas pembayaran (menit)</label><input name="payment_window_minutes" type="number" min="5" max="60" defaultValue={settings.payment_window_minutes} className={field}/></div>
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Garansi default (hari)</label><input name="default_warranty_days" type="number" min="0" max="365" defaultValue={settings.default_warranty_days} className={field}/></div>
          <div><label className="mb-2 block text-xs font-bold text-slate-600">Data akun terlihat (hari)</label><input name="credential_visibility_days" type="number" min="1" max="30" defaultValue={settings.credential_visibility_days} className={field}/></div>
        </div>
        <div className="mt-6 flex justify-end"><button className="rounded-2xl bg-[#103d2b] px-6 py-3 text-sm font-black text-white">Simpan pengaturan</button></div>
      </form>
    </AdminShell>
  );
}
