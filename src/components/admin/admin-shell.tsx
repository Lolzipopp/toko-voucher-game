import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAdmin } from "@/app/admin/actions";

type AdminShellProps = {
  active: "dashboard" | "products" | "inventory" | "orders" | "promos";
  admin: {
    full_name: string | null;
    email: string;
    role: string;
  };
  children: ReactNode;
};

type IconProps = { className?: string };

function GridIcon({ className = "" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>;
}
function BoxIcon({ className = "" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></svg>;
}
function KeyIcon({ className = "" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l2 2M18 5l2 2"/></svg>;
}

function ReceiptIcon({ className = "" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
}
function TagIcon({ className = "" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 13 13 20a2 2 0 0 1-2.8 0L4 13.8A2 2 0 0 1 3.6 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6L20 9.6a2 2 0 0 1 0 2.8Z"/><circle cx="8.5" cy="8.5" r="1.2"/></svg>;
}
function LogOutIcon({ className = "" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>;
}

const navItems = [
  { key: "dashboard" as const, href: "/admin", label: "Dashboard", icon: GridIcon },
  { key: "products" as const, href: "/admin/products", label: "Produk", icon: BoxIcon },
  { key: "inventory" as const, href: "/admin/inventory", label: "Stok", icon: KeyIcon },
  { key: "orders" as const, href: "/admin/orders", label: "Pesanan", icon: ReceiptIcon },
  { key: "promos" as const, href: "/admin/promos", label: "Promo", icon: TagIcon },
];

export default function AdminShell({ active, admin, children }: AdminShellProps) {
  const displayName = admin.full_name || admin.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#0c1f17] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-xl shadow-lg shadow-emerald-400/20">🎮</span>
            <div>
              <p className="text-sm font-black tracking-[0.2em]">RIKU STORE</p>
              <p className="mt-0.5 text-xs text-emerald-100/60">Admin Control Center</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <Link key={item.key} href={item.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${selected ? "bg-emerald-400 text-[#0c1f17] shadow-lg shadow-emerald-950/20" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-xs font-black">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-emerald-200/60">{admin.role}</p>
            </div>
          </div>
          <form action={logoutAdmin} className="mt-4">
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
              <LogOutIcon className="h-4 w-4" /> Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#103d2b] text-base">🎮</span>
              <div><p className="text-xs font-black tracking-[0.16em]">RIKU STORE</p><p className="text-[10px] text-slate-400">Admin</p></div>
            </Link>
            <form action={logoutAdmin}><button className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><LogOutIcon className="h-4 w-4" /></button></form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return <Link key={item.key} href={item.href} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold transition ${selected ? "bg-[#103d2b] text-white" : "text-slate-400"}`}><Icon className="h-4 w-4" />{item.label}</Link>;
        })}
      </nav>
    </div>
  );
}
