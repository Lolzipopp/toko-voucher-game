import Link from "next/link";

import {
  getPublicStoreSettings,
  whatsappUrl,
} from "@/lib/public-store/settings";

export default async function StoreFooter() {
  const settings = await getPublicStoreSettings();

  const whatsapp = whatsappUrl(
    settings.whatsapp_number,
    `Halo ${settings.store_name}, saya ingin bertanya mengenai produk atau pesanan.`,
  );

  return (
    <footer className="border-t border-emerald-950/10 bg-[#0d2f23] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-xl text-emerald-950">
              🎮
            </span>
            <div>
              <p className="font-black">{settings.store_name}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
                {settings.store_tagline}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
            Toko produk digital akun game dengan spesifikasi,
            harga, ketersediaan, dan ketentuan garansi yang
            ditampilkan sebelum pembelian.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            Belanja
          </p>
          <nav className="mt-4 grid gap-3 text-sm font-semibold text-white/70">
            <Link href="/#produk" className="hover:text-white">
              Katalog produk
            </Link>
            <Link href="/cart" className="hover:text-white">
              Keranjang
            </Link>
            <Link href="/akun" className="hover:text-white">
              Akun & pesanan saya
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            Informasi
          </p>
          <nav className="mt-4 grid gap-3 text-sm font-semibold text-white/70">
            <Link href="/tentang-kontak" className="hover:text-white">
              Tentang & kontak
            </Link>
            <Link href="/syarat-ketentuan" className="hover:text-white">
              Syarat & Ketentuan
            </Link>
            <Link href="/kebijakan-privasi" className="hover:text-white">
              Kebijakan Privasi
            </Link>
            <Link href="/refund-garansi" className="hover:text-white">
              Refund & Garansi
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            Bantuan
          </p>

          <div className="mt-4 grid gap-3 text-sm text-white/70">
            {settings.support_email ? (
              <a
                href={`mailto:${settings.support_email}`}
                className="break-all font-semibold hover:text-white"
              >
                {settings.support_email}
              </a>
            ) : (
              <p>Email bantuan belum diatur.</p>
            )}

            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:text-white"
              >
                Hubungi WhatsApp
              </a>
            ) : (
              <p>Nomor WhatsApp belum diatur.</p>
            )}

            <p className="text-xs leading-5 text-white/45">
              Jam balasan dapat berbeda. Simpan bukti transaksi
              dan nomor order saat meminta bantuan.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-5 text-xs text-white/45 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.store_name}.
            Seluruh hak dilindungi.
          </p>
          <p>
            Produk digital. Tidak berafiliasi dengan Roblox
            Corporation atau pengembang game terkait.
          </p>
        </div>
      </div>
    </footer>
  );
}
