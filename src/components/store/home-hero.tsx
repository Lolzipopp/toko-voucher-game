import Link from "next/link";

import SectionLink from "./section-link";

type Props = {
  whatsappUrl?: string | null;
  availableProducts: number;
  totalStock: number;
};

export default function HomeHero({ whatsappUrl, availableProducts, totalStock }: Props) {
  return (
    <section className="border-b border-white/10 bg-[#07111f]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-16">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            RIKU STORE · AKUN GAME DIGITAL
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl">
            Cari akun Roblox ready tanpa ribet.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Pilih akun, cek spek dan stok, lalu checkout. Stok dikunci 20 menit dan pembayaran lanjut lewat WhatsApp admin.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <SectionLink
              href="/#produk"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-300"
            >
              Cek stok akun
            </SectionLink>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-black text-white transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                Chat admin WA
              </a>
            ) : null}
          </div>

          <div className="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-black text-white">Stok real</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Data stok tampil dari katalog.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-black text-white">Reservasi 20 menit</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Akun dikunci setelah checkout.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-black text-white">Bayar setelah instruksi</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Admin bantu konfirmasi via WA.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#0b1726] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
          <div className="rounded-[1.5rem] border border-emerald-300/15 bg-[#081322] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Status toko</p>
                <h2 className="mt-2 text-2xl font-black text-white">Siap dibeli hari ini</h2>
              </div>
              <span className="rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-black text-emerald-200">ONLINE</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-3xl font-black text-white">{availableProducts}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">produk ready</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-3xl font-black text-white">{totalStock}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">stok tersedia</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4">
              <p className="text-sm font-black text-amber-100">Jangan transfer dulu.</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">
                Buat pesanan dulu, lalu tunggu instruksi pembayaran dari admin.
              </p>
            </div>

            <Link
              href="/akun"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Cek pesanan saya
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
