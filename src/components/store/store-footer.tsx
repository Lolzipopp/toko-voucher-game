"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_CLIENT_SETTINGS,
  fetchPublicSettings,
} from "@/lib/public-store/client-settings";
import { buildWhatsappUrl } from "@/lib/whatsapp/url";

export default function StoreFooter() {
  const [settings, setSettings] = useState(DEFAULT_CLIENT_SETTINGS);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicSettings(controller.signal).then(setSettings);
    return () => controller.abort();
  }, []);

  const whatsappUrl = useMemo(
    () => buildWhatsappUrl(
      settings.whatsapp_number,
      `Halo ${settings.store_name}, saya ingin bertanya mengenai produk atau pesanan.`,
    ),
    [settings.store_name, settings.whatsapp_number],
  );

  return (
    <footer className="border-t border-emerald-950/10 bg-[#0d2f23] pb-20 text-white md:pb-0">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-7 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-xl text-emerald-950">🎮</span>
            <div>
              <p className="font-black">{settings.store_name}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">{settings.store_tagline}</p>
            </div>
          </div>
          <p className="mt-3 max-w-sm text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">Toko produk digital akun game dengan spesifikasi, harga, ketersediaan, dan ketentuan garansi yang ditampilkan sebelum pembelian.</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Belanja</p>
          <nav className="mt-3 grid gap-2 text-xs font-semibold text-white/70 sm:text-sm">
            <Link href="/#produk" className="hover:text-white">Katalog produk</Link>
            <Link href="/cart" className="hover:text-white">Keranjang</Link>
            <Link href="/favorit" className="hover:text-white">Favorit</Link>
            <Link href="/akun" className="hover:text-white">Akun & pesanan saya</Link>
          </nav>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Informasi</p>
          <nav className="mt-3 grid gap-2 text-xs font-semibold text-white/70 sm:text-sm">
            <Link href="/tentang-kontak" className="hover:text-white">Tentang & kontak</Link>
            <Link href="/syarat-ketentuan" className="hover:text-white">Syarat & Ketentuan</Link>
            <Link href="/kebijakan-privasi" className="hover:text-white">Kebijakan Privasi</Link>
            <Link href="/refund-garansi" className="hover:text-white">Refund & Garansi</Link>
          </nav>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Bantuan</p>
          <div className="mt-3 grid gap-2 text-xs text-white/70 sm:text-sm">
            {settings.support_email ? <a href={`mailto:${settings.support_email}`} className="break-all font-semibold hover:text-white">{settings.support_email}</a> : <p>Email bantuan belum diatur.</p>}
            {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="font-semibold hover:text-white">Hubungi WhatsApp</a> : <p>Nomor WhatsApp belum diatur.</p>}
            <p className="text-xs leading-5 text-white/45">Simpan bukti transaksi dan nomor order saat meminta bantuan.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-1 px-4 py-3 text-[10px] leading-4 text-white/45 sm:flex-row sm:px-6 sm:text-xs">
          <p>© {new Date().getFullYear()} {settings.store_name}. Seluruh hak dilindungi.</p>
          <p>Produk digital. Tidak berafiliasi dengan Roblox Corporation atau pengembang game terkait.</p>
        </div>
      </div>
    </footer>
  );
}
