"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "heart" | "help" | "cart" | "user";

function NavIcon({ name }: { name: IconName }) {
  const common = "h-5 w-5";

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={common}>
        <path d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={common}>
        <path d="M12 20s-7-4.4-9-9.2C1.6 7.3 3.8 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.5 0 5.7 3.3 4.3 6.8C19 15.6 12 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "help") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={common}>
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" />
        <path d="M9.5 9a2.7 2.7 0 0 1 5.2 1.1c0 1.8-1.7 2.4-2.3 3.4-.2.3-.3.7-.3 1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "cart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={common}>
        <path d="M4 5h2l2 10h9.5l2-7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20h.01M18 20h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={common}>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function MobileQuickNav() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order/") ||
    pathname.startsWith("/products/")
  ) return null;

  const items = [
    { href: "/", icon: "home", label: "Home" },
    { href: "/favorit", icon: "heart", label: "Favorit" },
    { href: "/tentang-kontak", icon: "help", label: "Bantuan" },
    { href: "/cart", icon: "cart", label: "Keranjang" },
    { href: "/akun", icon: "user", label: "Akun" },
  ] as const;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#071522]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex touch-manipulation flex-col items-center rounded-xl px-1 py-2 text-[9px] font-black transition active:scale-95 ${
              active ? "bg-emerald-400 text-emerald-950" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <NavIcon name={item.icon} />
            <span className="mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
