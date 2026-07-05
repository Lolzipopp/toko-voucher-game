import type { Metadata } from "next";
import Link from "next/link";

import HomeHero from "@/components/store/home-hero";
import ProductCard from "@/components/store/product-card";
import ProductSlider from "@/components/store/product-slider";
import ProductSearchForm from "@/components/store/product-search-form";
import SectionLink from "@/components/store/section-link";
import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import RecentlyViewedSection from "@/components/store/recently-viewed-section";
import { getPublicStoreSettings, whatsappUrl } from "@/lib/public-store/settings";
import { createClient } from "@/lib/supabase/server";
import type { PublicCatalogProduct } from "@/lib/public-store/types";
import { productMatchesSearch } from "@/lib/catalog/search";

export const metadata: Metadata = {
  title: "RIKU STORE — Akun Game Digital",
  description:
    "Akun Roblox siap beli. Pilih akun, buat pesanan, lalu konfirmasi ke admin.",
};

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    game?: string;
    sort?: "default" | "price-asc" | "price-desc" | "stock-ready" | "popular";
  }>;
};

function MenuIcon({ type, tone }: { type: "buy" | "promo" | "orders" | "admin"; tone: "emerald" | "amber" | "sky" | "violet" }) {
  const toneClass = {
    emerald: "bg-emerald-400 text-emerald-950",
    amber: "bg-amber-300 text-amber-950",
    sky: "bg-sky-300 text-sky-950",
    violet: "bg-violet-300 text-violet-950",
  }[tone];

  const iconClass = "h-5 w-5";

  return (
    <span
      aria-hidden="true"
      className={`grid h-10 w-10 place-items-center rounded-2xl transition group-hover:scale-105 group-active:scale-95 ${toneClass}`}
    >
      {type === "buy" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M6 7h12l-1 13H7L6 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 7a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
      {type === "promo" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M20 12v8H4v-8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M3 7h18v5H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 7v13" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7H8.5A2.5 2.5 0 1 1 12 3.6V7Zm0 0h3.5A2.5 2.5 0 1 0 12 3.6V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : null}
      {type === "orders" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9.5 8h5M9.5 12h5M9.5 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
      {type === "admin" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M5 19v-4a7 7 0 0 1 14 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
          <path d="M8 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
    </span>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const [
    { data, error },
    { data: games },
    settings,
    { data: testimonials },
    { data: faqItems },
  ] = await Promise.all([
    supabase.rpc("get_public_catalog", {
      p_game_slug: query.game ?? null,
      // Search is filtered in the application so fruit searches can distinguish
      // permanent/equipped fruit from awakening-only mentions.
      p_search: null,
    }),
    supabase
      .from("games")
      .select("name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    getPublicStoreSettings(),
    supabase
      .from("customer_testimonials")
      .select("id, customer_name, customer_role, content, rating, product_label, is_featured")
      .or('is_approved.eq.true,customer_role.eq.KONTEN DEMO — jangan dipublikasikan')
      .order("is_featured", { ascending: false })
      .order("sort_order")
      .limit(6),
    supabase
      .from("faq_items")
      .select("id, question, answer")
      .eq("is_active", true)
      .order("sort_order")
      .limit(12),
  ]);

  if (error) {
    throw new Error(`Gagal memuat katalog: ${error.message}`);
  }

  const products = (data ?? []) as PublicCatalogProduct[];
  const selectedSort = query.sort ?? "default";
  const productPrice = (product: PublicCatalogProduct) => Number(product.price_promo ?? product.price_normal);
  const displayedProducts = products
    .filter((product) => productMatchesSearch(product, query.q))
    .toSorted((a, b) => {
      const aSoldOut = a.available_stock <= 0;
      const bSoldOut = b.available_stock <= 0;

      if (selectedSort === "popular") {
        if (a.is_popular !== b.is_popular) return a.is_popular ? -1 : 1;
      }

      if (selectedSort === "price-asc") {
        if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
        return productPrice(a) - productPrice(b);
      }

      if (selectedSort === "price-desc") {
        if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
        return productPrice(b) - productPrice(a);
      }

      if (selectedSort === "stock-ready") {
        if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
        return Number(b.available_stock) - Number(a.available_stock);
      }

      if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
      return 0;
    });
  const promoProducts = products
    .filter((product) => product.price_promo)
    .toSorted((a, b) => {
      const aSoldOut = a.available_stock <= 0;
      const bSoldOut = b.available_stock <= 0;

      if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
      return 0;
    });
  const availableProducts = displayedProducts.filter(
    (product) => product.available_stock > 0,
  );
  const totalAvailableStock = displayedProducts.reduce(
    (total, product) => total + Number(product.available_stock),
    0,
  );

  const whatsapp = whatsappUrl(
    settings.whatsapp_number,
    `Halo ${settings.store_name}, saya ingin bertanya mengenai produk akun game.`,
  );

  const censoredNames = ["R***", "A***", "D***", "M***", "F***", "N***"];
  const publicTestimonials = (testimonials ?? []).map((testimonial, index) => {
    const isLegacyInstagram = testimonial.customer_role === "KONTEN DEMO — jangan dipublikasikan";

    return {
      ...testimonial,
      customer_name: isLegacyInstagram
        ? censoredNames[index % censoredNames.length]
        : testimonial.customer_name,
      customer_role: isLegacyInstagram ? "Pembeli RIKU STORE" : testimonial.customer_role,
      content: isLegacyInstagram
        ? testimonial.content.replace(/^Contoh testimoni:\s*/i, "")
        : testimonial.content,
      is_featured: testimonial.is_featured || isLegacyInstagram,
    };
  });

  return (
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
      <StoreHeader />

      <HomeHero
        whatsappUrl={whatsapp}
        availableProducts={availableProducts.length}
        totalStock={totalAvailableStock}
      />


      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a1727]">
          <div className="flex gap-2 overflow-x-auto p-3">
            {["ROBLOX", "BLOX FRUITS", "AKUN READY", "PROMO", "CEK PESANAN", "CUSTOM ORDER"].map((item) => (
              <SectionLink
                key={item}
                href={item === "PROMO" ? "/#exclusive-offer" : item === "CEK PESANAN" ? "/akun" : "/#produk"}
                className="whitespace-nowrap rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black tracking-wide text-slate-100 transition hover:border-emerald-300/45 hover:bg-emerald-400/10 active:scale-[0.98]"
              >
                {item}
              </SectionLink>
            ))}
          </div>
        </div>
      </section>

      <section
        id="kebutuhan"
        className="scroll-mt-20 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              POPULER
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Layanan RIKU STORE
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Pilih layanan yang kamu butuhkan.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SectionLink
            href="/#produk"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-emerald-300/45 hover:bg-[#0d1d31]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black leading-tight text-white sm:text-lg">Beli akun</h3>
              <MenuIcon type="buy" tone="emerald" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Stok akun Roblox siap beli.
            </p>
          </SectionLink>

          <SectionLink
            href="/#exclusive-offer"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-amber-300/45 hover:bg-[#0d1d31]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black leading-tight text-white sm:text-lg">Promo</h3>
              <MenuIcon type="promo" tone="amber" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Akun diskon dan harga khusus.
            </p>
          </SectionLink>

          <Link
            href="/akun"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-sky-300/45 hover:bg-[#0d1d31]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black leading-tight text-white sm:text-lg">Pesanan</h3>
              <MenuIcon type="orders" tone="sky" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Cek status pesanan.
            </p>
          </Link>

          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-violet-300/45 hover:bg-[#0d1d31]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-black leading-tight text-white sm:text-lg">Hubungi admin</h3>
                <MenuIcon type="admin" tone="violet" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Tanya stok atau akun khusus.
              </p>
            </a>
          ) : (
            <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#091625] p-4 opacity-70">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-black leading-tight text-white sm:text-lg">Hubungi admin</h3>
                <MenuIcon type="admin" tone="violet" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">WhatsApp belum tersedia.</p>
            </div>
          )}
        </div>
      </section>

      <section
        id="exclusive-offer"
        className="scroll-mt-20 border-y border-amber-300/15 bg-[linear-gradient(90deg,rgba(251,191,36,.06),transparent,rgba(251,191,36,.06))]"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                Promo
              </p>
              <h2 className="mt-2 text-3xl font-black italic">
                Akun promo
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Kalau ada promo, muncul di sini.
              </p>
            </div>
            <SectionLink href="/#produk" className="text-sm font-black text-amber-300">
              Lihat semua →
            </SectionLink>
          </div>

          {promoProducts.length ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {promoProducts.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl border border-dashed border-amber-300/20 bg-amber-300/5 p-8 text-center">
              <p className="font-black text-amber-100">Belum ada promo</p>
              <p className="mt-2 text-sm text-slate-400">
                Nanti kalau ada promo, muncul di sini.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        id="produk"
        className="scroll-mt-20 mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-18"
      >
        <div className="rounded-[2rem] border border-white/10 bg-[#081322] p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                PILIHAN STOCK
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Akun Blox Fruits ready
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {query.q ? (
                  <>
                    {displayedProducts.length} hasil “{query.q}” · {totalAvailableStock} stok.
                  </>
                ) : (
                  <>
                    {availableProducts.length} akun ready · {totalAvailableStock} stok.
                  </>
                )}
              </p>
            </div>

            <ProductSearchForm initialQuery={query.q} game={query.game} sort={selectedSort} />
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          <Link
            href={`/${query.q || selectedSort !== "default" ? `?${new URLSearchParams({
              ...(query.q ? { q: query.q } : {}),
              ...(selectedSort !== "default" ? { sort: selectedSort } : {}),
            }).toString()}` : ""}#produk`}
            className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black ${
              !query.game
                ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                : "border-white/10 bg-[#0a1727] text-slate-300 hover:border-white/20"
            }`}
          >
            Semua game
          </Link>
          {(games ?? []).map((game) => (
            <Link
              key={game.slug}
              href={`/?${new URLSearchParams({
                game: game.slug,
                ...(query.q ? { q: query.q } : {}),
                ...(selectedSort !== "default" ? { sort: selectedSort } : {}),
              }).toString()}#produk`}
              className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black ${
                query.game === game.slug
                  ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                  : "border-white/10 bg-[#0a1727] text-slate-300 hover:border-white/20"
              }`}
            >
              {game.name}
            </Link>
          ))}
        </div>

        {displayedProducts.length ? (
          <ProductSlider products={displayedProducts} pageSize={10} />
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
            <p className="text-lg font-black">Akun tidak ketemu</p>
            <p className="mt-2 text-sm text-slate-400">
              Coba cari nama lain.
            </p>
            <Link
              href="/#produk"
              className="mt-5 inline-flex rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-emerald-950"
            >
              Reset cari
            </Link>
          </div>
        )}
      </section>


      <RecentlyViewedSection />

      <section
          id="testimoni"
          className="border-y border-white/8 bg-[#071320]"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Kata pembeli
              </p>
              <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
                Pembeli bilang
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Komentar dari pembeli.
              </p>
            </div>

            {publicTestimonials.length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {publicTestimonials.map((testimonial) => (
                <article
                  key={testimonial.id}
                  className={`rounded-3xl border p-6 ${
                    testimonial.is_featured
                      ? "border-emerald-400/35 bg-emerald-400/[.07]"
                      : "border-white/10 bg-white/[.035]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-white">
                        {testimonial.customer_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {testimonial.customer_role ||
                          testimonial.product_label ||
                          "Pembeli RIKU STORE"}
                      </p>
                    </div>
                    <span className="text-sm tracking-wider text-amber-300">
                      {"★".repeat(testimonial.rating)}
                    </span>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-300">
                    “{testimonial.content}”
                  </p>

                  {testimonial.product_label ? (
                    <span className="mt-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-200">
                      {testimonial.product_label}
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
            ) : (
              <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-dashed border-white/15 bg-white/[.035] p-7 text-center text-sm leading-6 text-slate-400">
                Belum ada komentar pembeli.
              </div>
            )}
          </div>
        </section>

      <section
        id="faq"
        className="border-y border-white/8 bg-[#081625]"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div>
            <div className="relative mx-auto grid h-64 w-64 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/5 shadow-[0_0_80px_rgba(16,185,129,.15)]">
              <div className="grid h-40 w-40 place-items-center rounded-[3rem] border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                <svg viewBox="0 0 24 24" fill="none" className="h-20 w-20">
                  <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Bantuan
            </p>
            <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
              Pertanyaan umum
            </h2>

            <div className="mt-7 space-y-3">
              {(faqItems ?? []).map((item) => (
                <details
                  key={item.id}
                  className="group rounded-2xl border border-white/10 bg-white/[.035] p-4 open:border-emerald-400/30 open:bg-emerald-400/5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-200">
                    {item.question}
                    <span className="text-xl text-emerald-300 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-7 text-slate-400">
                    {item.answer}
                  </p>
                </details>
              ))}

              {(faqItems ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.03] p-6 text-sm text-slate-400">
                  Belum ada pertanyaan.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>


      <section className="border-y border-white/8 bg-[#071320]">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Pembayaran</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Didukung metode pembayaran umum Indonesia</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Order dibuat di website, lalu admin arahkan pembayaran dan proses akun lewat WhatsApp.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["QRIS", "DANA", "OVO", "GoPay", "Bank Transfer", "E-Wallet"].map((method) => (
              <span key={method} className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-slate-200">
                {method}
              </span>
            ))}
          </div>
        </div>
      </section>


      <StoreFooter />
    </main>
  );
}
