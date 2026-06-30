import Link from "next/link";

import SectionLink from "./section-link";

type Props = {
  whatsappUrl?: string | null;
  availableProducts: number;
  totalStock: number;
};

export default function HomeHero({ whatsappUrl, availableProducts, totalStock }: Props) {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_.9fr] lg:items-center lg:py-16">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            RIKU STORE
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
            Akun Roblox ready, tinggal pilih.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Pilih akun, buat pesanan, lalu konfirmasi ke admin lewat WhatsApp.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <SectionLink
              href="/#produk"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              Lihat akun ready
            </SectionLink>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex touch-manipulation items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100 active:scale-[0.98]"
              >
                Hubungi admin
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status toko</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Ready hari ini</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">ONLINE</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-3xl font-black text-slate-950">{availableProducts}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">akun ready</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-3xl font-black text-slate-950">{totalStock}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">stok</p>
            </div>
          </div>

          <Link
            href="/akun"
            className="mt-4 inline-flex w-full touch-manipulation items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            Cek status pesanan
          </Link>
        </div>
      </div>
    </section>
  );
}
