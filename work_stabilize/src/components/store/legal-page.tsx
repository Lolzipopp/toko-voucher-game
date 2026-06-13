import type { ReactNode } from "react";
import Link from "next/link";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { getPublicStoreSettings } from "@/lib/public-store/settings";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
};

export default async function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  children,
}: LegalPageProps) {
  const settings = await getPublicStoreSettings();

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />

      <section className="border-b border-emerald-950/10 bg-[#103d2b] text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
            {description}
          </p>
          <p className="mt-5 text-xs text-white/40">
            Terakhir diperbarui: {updatedAt}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:py-14">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Dokumen Toko
          </p>
          <nav className="mt-3 grid gap-1 text-sm font-bold text-slate-600">
            <Link
              href="/syarat-ketentuan"
              className="rounded-xl px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Syarat & Ketentuan
            </Link>
            <Link
              href="/kebijakan-privasi"
              className="rounded-xl px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Kebijakan Privasi
            </Link>
            <Link
              href="/refund-garansi"
              className="rounded-xl px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Refund & Garansi
            </Link>
            <Link
              href="/tentang-kontak"
              className="rounded-xl px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Tentang & Kontak
            </Link>
          </nav>
        </aside>

        <article className="legal-content rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          {children}

          <section className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-black text-emerald-950">
              Butuh bantuan?
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/70">
              Hubungi {settings.store_name} melalui email bantuan
              atau WhatsApp yang tercantum pada halaman Kontak.
              Sertakan nomor order agar pemeriksaan lebih cepat.
            </p>
            <Link
              href="/tentang-kontak"
              className="mt-4 inline-flex rounded-2xl bg-[#103d2b] px-4 py-2.5 text-sm font-black text-white"
            >
              Buka halaman kontak
            </Link>
          </section>
        </article>
      </div>

      <StoreFooter />
    </main>
  );
}
