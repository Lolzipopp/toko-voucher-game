"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CLIENT_SETTINGS,
  fetchPublicSettings,
} from "@/lib/public-store/client-settings";

import CartLink from "./cart-link";
import SectionLink from "./section-link";

export default function StoreHeader() {
  const [settings, setSettings] = useState(DEFAULT_CLIENT_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicSettings(controller.signal).then(setSettings);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-x-clip border-b border-emerald-400/15 bg-[#06111f]/94 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-400/35 bg-emerald-400/10 text-xl font-black text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,.16)] transition group-hover:border-emerald-300/70">
            R
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black italic tracking-tight">
              {settings.store_name}
            </span>
            <span className="hidden truncate text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/80 sm:block">
              {settings.store_tagline}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <CartLink />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Buka menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
            >
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-white" />
                <span className="block h-0.5 w-5 rounded-full bg-white" />
                <span className="block h-0.5 w-5 rounded-full bg-white" />
              </span>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-3 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/10 bg-[#0a1828] p-3 shadow-[0_25px_80px_rgba(0,0,0,.55)]">
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    Akun Pembeli
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Masuk untuk melihat pesanan, atau daftar gratis dengan email.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/akun/login?mode=login"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl bg-emerald-400 px-3 py-2.5 text-center text-xs font-black text-emerald-950"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/akun/login?mode=register"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-center text-xs font-black text-emerald-200"
                    >
                      Daftar
                    </Link>
                  </div>
                  <Link
                    href="/akun"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 block rounded-xl px-3 py-2 text-center text-xs font-bold text-slate-300 hover:bg-white/5"
                  >
                    Buka akun & pesanan saya
                  </Link>
                </div>

                <nav className="mt-2 grid gap-1 text-sm font-bold">
                  <SectionLink
                    href="/#kebutuhan"
                    onNavigate={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
                  >
                    Pilih kebutuhanmu
                  </SectionLink>
                  <SectionLink
                    href="/#exclusive-offer"
                    onNavigate={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
                  >
                    Exclusive Offer
                  </SectionLink>
                  <SectionLink
                    href="/#produk"
                    onNavigate={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
                  >
                    Semua akun
                  </SectionLink>
                  <SectionLink
                    href="/#faq"
                    onNavigate={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
                  >
                    FAQ
                  </SectionLink>
                  <Link
                    href="/favorit"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
                  >
                    Favorit
                  </Link>
                  <Link
                    href="/tentang-kontak"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
                  >
                    Kontak & bantuan
                  </Link>
                </nav>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
