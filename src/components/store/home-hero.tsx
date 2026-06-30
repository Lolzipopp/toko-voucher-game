import Link from "next/link";

import SectionLink from "./section-link";

type Props = {
  whatsappUrl?: string | null;
  availableProducts: number;
  totalStock: number;
};

export default function HomeHero({ whatsappUrl, availableProducts, totalStock }: Props) {
  return (
    <section className="bg-[#06111f]">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative min-h-[260px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,.22),transparent_34%),linear-gradient(135deg,#0c1b2d,#08111e_58%,#06111f)] p-5 sm:min-h-[360px] sm:p-8">
          <div className="absolute right-[-4rem] top-[-5rem] h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[20%] h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
                RIKU STORE
              </p>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl">
                Akun Roblox ready tanpa ribet.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Pilih akun, buat pesanan, lalu lanjut konfirmasi lewat WhatsApp admin.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SectionLink
                href="/#produk"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-300"
              >
                Beli akun sekarang
              </SectionLink>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex touch-manipulation items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/12 active:scale-[0.98]"
                >
                  Hubungi admin
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[2rem] border border-white/10 bg-[#0a1727] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Status</p>
                <h2 className="mt-2 text-2xl font-black text-white">Stok hari ini</h2>
              </div>
              <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">ONLINE</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-3xl font-black text-white">{availableProducts}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">akun ready</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-3xl font-black text-white">{totalStock}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">stok</p>
              </div>
            </div>
          </div>

          <Link
            href="/akun"
            className="group flex min-h-32 flex-col justify-between rounded-[2rem] border border-white/10 bg-[#0a1727] p-5 transition hover:border-sky-300/40 hover:bg-[#0d1d31] active:scale-[0.99]"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Transaksi</p>
            <div>
              <h3 className="text-xl font-black text-white">Cek pesanan</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Lihat status order yang sudah kamu buat.</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
