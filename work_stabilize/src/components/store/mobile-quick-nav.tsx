"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileQuickNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout") || pathname.startsWith("/order/")) return null;
  const items = [
    ["/", "⌂", "Home"],
    ["/favorit", "♡", "Favorit"],
    ["/tentang-kontak", "?", "Bantuan"],
    ["/cart", "🛒", "Keranjang"],
    ["/akun", "☺", "Akun"],
  ] as const;
  return <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#071522]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl md:hidden">{items.map(([href, icon, label]) => <Link key={href} href={href} className={`flex flex-col items-center rounded-xl px-1 py-2 text-[9px] font-black ${pathname === href ? "bg-emerald-400 text-emerald-950" : "text-slate-400"}`}><span className="text-base leading-none">{icon}</span><span className="mt-1">{label}</span></Link>)}</nav>;
}
