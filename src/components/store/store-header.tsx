import Link from "next/link";
import CartLink from "./cart-link";

export default function StoreHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#f7fbf8]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#103d2b] text-xl shadow-lg shadow-emerald-950/15">🎮</span>
          <span>
            <span className="block text-sm font-black tracking-tight text-slate-950">RIKU STORE</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Akun Roblox Instan</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/#produk" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white">Produk</Link>
          <CartLink />
          <Link href="/admin/login" className="hidden rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 sm:inline-flex">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
