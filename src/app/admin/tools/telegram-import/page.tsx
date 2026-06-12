import { readFile } from "node:fs/promises";
import path from "node:path";

import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import { importTelegramBatch, repairTelegramProductImages } from "./actions";

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

type Manifest = {
  entries: Array<{
    product_code: string;
    name: string;
    status: "active" | "draft";
    price_normal: number;
    price_missing: boolean;
    images: string[];
  }>;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function TelegramImportPage({ searchParams }: PageProps) {
  const query = await searchParams;
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

  const manifestPath = path.join(
    process.cwd(),
    "private-import",
    "telegram-batch-01",
    "manifest.json",
  );

  let manifest: Manifest | null = null;
  let readError: string | null = null;

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  } catch (error) {
    readError = error instanceof Error ? error.message : "Manifest tidak dapat dibaca.";
  }

  const activeCount = manifest?.entries.filter((entry) => entry.status === "active").length ?? 0;
  const draftCount = manifest?.entries.filter((entry) => entry.status === "draft").length ?? 0;
  const imageCount = manifest?.entries.reduce((total, entry) => total + entry.images.length, 0) ?? 0;
  const enabled = process.env.ENABLE_INTERNAL_TEST_TOOLS === "true";

  return (
    <AdminShell active="products" admin={admin}>
      <PageTitle
        eyebrow="Local Import Tool"
        title="Sinkronisasi export Telegram lengkap"
        description="Satu tombol untuk memasang gambar pada produk lama dan membuat produk Telegram yang belum ada. Produk dicocokkan berdasarkan product_code agar tidak duplikat."
      />

      {query.success ? <Notice type="success">{query.success}</Notice> : null}
      {query.error ? <Notice type="error">{query.error}</Notice> : null}
      {readError ? <Notice type="error">Manifest gagal dibaca: {readError}</Notice> : null}
      {!enabled ? (
        <Notice type="error">
          Set ENABLE_INTERNAL_TEST_TOOLS=true di .env.local lalu restart dev server sebelum menjalankan import.
        </Notice>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total produk</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{manifest?.entries.length ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Aktif</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Draft tanpa harga</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{draftCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Gambar</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{imageCount}</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-950">
        <h2 className="font-black">Wajib jalankan migration 32 terlebih dahulu</h2>
        <p className="mt-2 leading-6">
          Jalankan <code>20260612000032_telegram_launch_finalize_v1.sql</code> di Supabase SQL Editor. Migration ini memperbaiki jalur penyimpanan username/password terenkripsi.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <h2 className="font-black">Sebelum klik import</h2>
        <p className="mt-2 leading-6">
          Pastikan kamu login sebagai admin, bucket product-images tersedia, dan game Blox Fruits aktif. Produk tanpa harga dibuat draft dengan harga placeholder Rp1 agar tidak tampil ke pembeli. Setelah import, isi harga sebenarnya lalu aktifkan manual.
        </p>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <form action={repairTelegramProductImages} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-black text-emerald-950">Perbaiki gambar produk yang sudah diimpor</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            Gunakan tombol ini jika produk dan stok sudah masuk tetapi gambarnya belum tampil. Tool hanya mencari produk berdasarkan product_code lalu menambahkan gambar yang belum ada. Produk dan stok tidak dibuat ulang.
          </p>
          <button
            type="submit"
            disabled={!enabled || !manifest}
            className="mt-4 rounded-2xl bg-emerald-700 px-6 py-3 font-black text-white shadow-lg transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Perbaiki semua gambar sekarang
          </button>
        </form>

        <form action={importTelegramBatch} className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-950">Siapkan toko sampai siap jual</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Satu tombol ini membuat/memperbarui produk Telegram, memasang gambar, mengisi username/password terenkripsi, menghapus produk dan stok TEST, lalu hanya mengaktifkan produk yang punya harga, gambar, dan stok.
          </p>
          <button
            type="submit"
            disabled={!enabled || !manifest}
            className="mt-4 rounded-2xl bg-[#103d2b] px-6 py-3 font-black text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#0b2f21] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siapkan toko sekarang
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {manifest?.entries.map((entry) => (
          <article key={entry.product_code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{entry.name}</p>
                <p className="mt-1 text-xs text-slate-400">{entry.product_code} · {entry.images.length} gambar</p>
              </div>
              <div className="text-right">
                <p className={entry.price_missing ? "font-black text-amber-600" : "font-black text-emerald-700"}>
                  {entry.price_missing ? "Harga belum ada" : formatRupiah(entry.price_normal)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{entry.status}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
