import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import CartLink from "./cart-link";

type PublicSettings = { store_name?: string; store_tagline?: string };

export default async function StoreHeader() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_store_settings");
  const settings = (data ?? {}) as PublicSettings;

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#f7fbf8]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#103d2b] text-xl shadow-lg shadow-emerald-950/15">🎮</span>
          <span><span className="block text-sm font-black tracking-tight text-slate-950">{settings.store_name || "RIKU STORE"}</span><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{settings.store_tagline || "Akun Roblox Instan"}</span></span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#produk" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white sm:inline-flex">Produk</Link>
          <Link href="/tentang-kontak" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white lg:inline-flex">Tentang</Link>
          <Link href="/akun" className="rounded-xl px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-white sm:px-3 sm:text-sm">Akun Saya</Link>
          <CartLink />
          <Link href="/admin/login" className="hidden rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 md:inline-flex">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
