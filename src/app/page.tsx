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
      .eq("is_approved", true)
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
  const displayedProducts = products
    .filter((product) => productMatchesSearch(product, query.q))
    .toSorted((a, b) => {
      const aSoldOut = a.available_stock <= 0;
      const bSoldOut = b.available_stock <= 0;

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

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <StoreHeader />

      <HomeHero
        whatsappUrl={whatsapp}
        availableProducts={availableProducts.length}
        totalStock={totalAvailableStock}
      />

      <section
        id="kebutuhan"
        className="scroll-mt-20 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Menu utama
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Pilih kebutuhanmu
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Pilih menu yang dibutuhkan. Untuk membeli, langsung lihat daftar akun.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SectionLink
            href="/#produk"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black leading-tight text-slate-950 sm:text-lg">Beli akun</h3>
              <MenuIcon type="buy" tone="emerald" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Lihat akun yang tersedia.
            </p>
          </SectionLink>

          <SectionLink
            href="/#exclusive-offer"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:bg-amber-50/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black leading-tight text-slate-950 sm:text-lg">Promo</h3>
              <MenuIcon type="promo" tone="amber" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Lihat promo aktif.
            </p>
          </SectionLink>

          <Link
            href="/akun"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black leading-tight text-slate-950 sm:text-lg">Pesanan</h3>
              <MenuIcon type="orders" tone="sky" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Cek status pesanan.
            </p>
          </Link>

          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:bg-violet-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-black leading-tight text-slate-950 sm:text-lg">Hubungi admin</h3>
                <MenuIcon type="admin" tone="violet" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Cari akun khusus lewat admin.
              </p>
            </a>
          ) : (
            <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 opacity-70">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-black leading-tight text-slate-950 sm:text-lg">Hubungi admin</h3>
                <MenuIcon type="admin" tone="violet" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">WhatsApp belum tersedia.</p>
            </div>
          )}
        </div>
      </section>

      <section
        id="exclusive-offer"
        className="scroll-mt-20 border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                Promo
              </p>
              <h2 className="mt-2 text-3xl font-black italic">
                Akun promo
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Kalau ada promo, muncul di sini.
              </p>
            </div>
            <SectionLink href="/#produk" className="text-sm font-black text-amber-700">
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
            <div className="mt-7 rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-8 text-center">
              <p className="font-black text-amber-800">Belum ada promo</p>
              <p className="mt-2 text-sm text-slate-600">
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
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                Daftar akun
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Akun ready
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
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

            <ProductSearchForm initialQuery={query.q} game={query.game} />
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          <Link
            href={query.q ? `/?q=${encodeURIComponent(query.q)}` : "/"}
            className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black ${
              !query.game
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            Semua game
          </Link>
          {(games ?? []).map((game) => (
            <Link
              key={game.slug}
              href={`/?game=${game.slug}${
                query.q ? `&q=${encodeURIComponent(query.q)}` : ""
              }#produk`}
              className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black ${
                query.game === game.slug
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {game.name}
            </Link>
          ))}
        </div>

        {displayedProducts.length ? (
          <ProductSlider products={displayedProducts} pageSize={10} />
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-black">Akun tidak ketemu</p>
            <p className="mt-2 text-sm text-slate-600">
              Coba cari nama lain.
            </p>
            <Link
              href="/#produk"
              className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white"
            >
              Reset cari
            </Link>
          </div>
        )}
      </section>


      <RecentlyViewedSection />

      <section
          id="testimoni"
          className="border-y border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                Kata pembeli
              </p>
              <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
                Pembeli bilang
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Komentar dari pembeli.
              </p>
            </div>

            {(testimonials ?? []).length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {(testimonials ?? []).map((testimonial) => (
                <article
                  key={testimonial.id}
                  className={`rounded-3xl border p-6 ${
                    testimonial.is_featured
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-950">
                        {testimonial.customer_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {testimonial.customer_role ||
                          testimonial.product_label ||
                          "Pembeli RIKU STORE"}
                      </p>
                    </div>
                    <span className="text-sm tracking-wider text-amber-700">
                      {"★".repeat(testimonial.rating)}
                    </span>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-600">
                    “{testimonial.content}”
                  </p>

                  {testimonial.product_label ? (
                    <span className="mt-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                      {testimonial.product_label}
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
            ) : (
              <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-dashed border-slate-300 bg-white p-7 text-center text-sm leading-6 text-slate-600">
                Belum ada komentar pembeli.
              </div>
            )}
          </div>
        </section>

      <section
        id="faq"
        className="border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div>
            <div className="relative mx-auto grid h-64 w-64 place-items-center rounded-full border border-slate-200 bg-white">
              <div className="grid h-40 w-40 place-items-center rounded-[3rem] border border-emerald-200 bg-emerald-50 text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-16 w-16">
                  <path d="M12 3 19 6v5c0 4.6-2.8 8.2-7 10-4.2-1.8-7-5.4-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="m8.8 12 2.1 2.1 4.4-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Bantuan
            </p>
            <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
              Pertanyaan umum
            </h2>

            <div className="mt-7 space-y-3">
              {(faqItems ?? []).map((item) => (
                <details
                  key={item.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-emerald-300 open:bg-emerald-50"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-900">
                    {item.question}
                    <span className="text-xl text-emerald-700 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}

              {(faqItems ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                  Belum ada pertanyaan.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-5 rounded-[2rem] border border-emerald-200 bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Sebelum bayar
            </p>
            <h2 className="mt-2 text-2xl font-black italic">
              Total bayar muncul sebelum bayar
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Total pesanan dapat dicek sebelum pembayaran. Jika perlu bantuan, hubungi admin.
            </p>
          </div>
          <span className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-amber-800">
            Bayar manual dulu
          </span>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
