import type { Metadata } from "next";
import Link from "next/link";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import {
  getPublicStoreSettings,
  whatsappUrl,
} from "@/lib/public-store/settings";

export const metadata: Metadata = {
  title: "Tentang & Kontak — RIKU STORE",
  description:
    "Informasi toko, cara kerja pembelian produk digital, dan kontak bantuan RIKU STORE.",
};

export default async function AboutContactPage() {
  const settings = await getPublicStoreSettings();
  const whatsapp = whatsappUrl(
    settings.whatsapp_number,
    `Halo ${settings.store_name}, saya ingin bertanya mengenai produk atau pesanan.`,
  );

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />

      <section className="bg-[#103d2b] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
            Tentang Toko
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
            {settings.store_name}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/65">
            {settings.store_name} menyediakan produk digital
            berupa akses akun game dengan informasi spesifikasi,
            harga, ketersediaan, masa garansi, dan alur pengiriman
            yang ditampilkan secara jelas sebelum pembayaran.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="grid gap-4 md:grid-cols-3">
          {[
            [
              "1",
              "Pilih produk",
              "Pembeli memeriksa spesifikasi, harga, stok, dan ketentuan produk.",
            ],
            [
              "2",
              "Selesaikan pembayaran",
              `Pembeli menyelesaikan pembayaran dalam batas ${settings.payment_window_minutes} menit yang tampil di halaman pesanan.`,
            ],
            [
              "3",
              "Akses produk",
              "Setelah pembayaran terverifikasi, produk digital tersedia melalui akun pembeli dan halaman pesanan.",
            ],
          ].map(([number, title, description]) => (
            <article
              key={number}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 font-black text-emerald-800">
                {number}
              </span>
              <h2 className="mt-5 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Transparansi
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Informasi sebelum membeli
            </h2>

            <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600">
              <p>
                Harga ditampilkan dalam rupiah. Checkout
                menampilkan harga produk, diskon, biaya transaksi
                bila ada, dan total akhir sebelum pembayaran.
              </p>
              <p>
                Produk dikirim secara digital setelah pembayaran
                terverifikasi. Ketentuan garansi dan refund dapat
                dibaca sebelum pembeli melakukan transaksi.
              </p>
              <p>
                {settings.store_name} tidak berafiliasi dengan
                Roblox Corporation atau pengembang game terkait.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/syarat-ketentuan"
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600"
              >
                Syarat & Ketentuan
              </Link>
              <Link
                href="/refund-garansi"
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600"
              >
                Refund & Garansi
              </Link>
            </div>
          </article>

          <article className="rounded-[2rem] bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              Hubungi Kami
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Bantuan pelanggan
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              Saat menghubungi bantuan, sertakan nomor order,
              email pembeli, dan penjelasan masalah agar
              pemeriksaan lebih cepat.
            </p>

            <div className="mt-6 grid gap-3">
              {settings.support_email ? (
                <a
                  href={`mailto:${settings.support_email}`}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black text-white"
                >
                  Email: {settings.support_email}
                </a>
              ) : (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  Email bantuan belum diatur oleh admin.
                </div>
              )}

              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-emerald-950"
                >
                  Buka WhatsApp
                </a>
              ) : (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  Nomor WhatsApp belum diatur oleh admin.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>

      <StoreFooter />
    </main>
  );
}
