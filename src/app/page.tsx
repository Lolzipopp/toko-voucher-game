import type { Metadata } from "next";
import Link from "next/link";

import HomeHero from "@/components/store/home-hero";
import ProductCard from "@/components/store/product-card";
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
    "Akun game digital dengan spesifikasi jelas, stok nyata, checkout aman, dan garansi.",
};

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    game?: string;
  }>;
};

function NeedIcon({ label, tone }: { label: string; tone: "emerald" | "amber" | "sky" | "violet" }) {
  const toneClass = {
    emerald: "border-emerald-300/35 bg-emerald-300/10 text-emerald-200",
    amber: "border-amber-300/35 bg-amber-300/10 text-amber-200",
    sky: "border-sky-300/35 bg-sky-300/10 text-sky-200",
    violet: "border-violet-300/35 bg-violet-300/10 text-violet-200",
  }[tone];

  return (
    <span
      aria-hidden="true"
      className={`grid h-11 w-11 place-items-center rounded-2xl border text-sm font-black tracking-tight shadow-[0_0_24px_rgba(255,255,255,.05)] sm:h-14 sm:w-14 sm:rounded-3xl sm:text-base ${toneClass}`}
    >
      {label}
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
  const displayedProducts = products.filter((product) =>
    productMatchesSearch(product, query.q),
  );
  const promoProducts = products.filter((product) => product.price_promo);
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
    <main className="min-h-screen overflow-hidden bg-[#06111f] text-white">
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
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Mulai dari sini
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Mau ngapain hari ini?
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Pilih jalur yang paling cepat. Kalau cuma mau beli akun, langsung cek stok.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SectionLink
            href="/#produk"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-emerald-300/45 hover:bg-[#0d1d31]"
          >
            <NeedIcon label="BA" tone="emerald" />
            <h3 className="mt-4 text-sm font-black leading-tight text-white sm:text-base">BELI AKUN</h3>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Cari akun berdasarkan game, harga, dan spesifikasi.
            </p>
            <span className="mt-3 text-[10px] font-black uppercase tracking-wide text-emerald-300">
              Lihat →
            </span>
          </SectionLink>

          <SectionLink
            href="/#exclusive-offer"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-amber-300/45 hover:bg-[#0d1d31]"
          >
            <NeedIcon label="PR" tone="amber" />
            <h3 className="mt-4 text-sm font-black leading-tight text-white sm:text-base">PROMO</h3>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Cek akun dengan harga khusus yang sedang aktif.
            </p>
            <span className="mt-3 text-[10px] font-black uppercase tracking-wide text-amber-300">
              Cek →
            </span>
          </SectionLink>

          <Link
            href="/akun"
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-sky-300/45 hover:bg-[#0d1d31]"
          >
            <NeedIcon label="PS" tone="sky" />
            <h3 className="mt-4 text-sm font-black leading-tight text-white sm:text-base">PESANAN</h3>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Masuk lewat email untuk melihat order dan data akun.
            </p>
            <span className="mt-3 text-[10px] font-black uppercase tracking-wide text-sky-300">
              Buka →
            </span>
          </Link>

          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#0a1727] p-4 transition hover:border-violet-300/45 hover:bg-[#0d1d31]"
            >
              <NeedIcon label="WA" tone="violet" />
              <h3 className="mt-4 text-sm font-black leading-tight text-white sm:text-base">JUAL / CARI</h3>
              <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
                Hubungi admin untuk menjual akun atau mencari spesifikasi khusus.
              </p>
              <span className="mt-3 text-[10px] font-black uppercase tracking-wide text-violet-300">
                Chat →
              </span>
            </a>
          ) : (
            <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-[#091625] p-4 opacity-70">
              <NeedIcon label="WA" tone="violet" />
              <h3 className="mt-4 text-sm font-black leading-tight text-white sm:text-base">JUAL / CARI</h3>
              <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">Layanan WhatsApp sedang tidak tersedia.</p>
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
                Penawaran terbatas
              </p>
              <h2 className="mt-2 text-3xl font-black italic">
                EXCLUSIVE OFFER
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Harga khusus hanya tampil ketika promo produk benar-benar aktif.
              </p>
            </div>
            <SectionLink href="/#produk" className="text-sm font-black text-amber-300">
              Lihat semua produk →
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
              <p className="font-black text-amber-100">Belum ada penawaran khusus</p>
              <p className="mt-2 text-sm text-slate-400">
                Promo terbaru akan tampil di sini. Cek kembali secara berkala.
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
                Katalog akun
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Akun yang ready
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {query.q ? (
                  <>
                    {displayedProducts.length} hasil untuk “{query.q}” · {totalAvailableStock} stok tersedia.
                  </>
                ) : (
                  <>
                    {availableProducts.length} produk ready · total {totalAvailableStock} stok tersedia.
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
                ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                : "border-white/10 bg-[#0a1727] text-slate-300 hover:border-white/20"
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
                  ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                  : "border-white/10 bg-[#0a1727] text-slate-300 hover:border-white/20"
              }`}
            >
              {game.name}
            </Link>
          ))}
        </div>

        {displayedProducts.length ? (
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
            <p className="text-lg font-black">Produk tidak ditemukan</p>
            <p className="mt-2 text-sm text-slate-400">
              Coba kata kunci lain atau lihat semua game.
            </p>
            <Link
              href="/#produk"
              className="mt-5 inline-flex rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-emerald-950"
            >
              Reset pencarian
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
                Testimoni pembeli
              </p>
              <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
                PENGALAMAN PEMBELI ASLI
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Semua testimoni yang tampil telah melalui verifikasi.
              </p>
            </div>

            {(testimonials ?? []).length ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {(testimonials ?? []).map((testimonial) => (
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
                Belum ada testimoni pembeli yang ditampilkan. Testimoni asli akan muncul setelah diverifikasi.
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
              <div className="grid h-40 w-40 place-items-center rounded-[3rem] border border-emerald-400/30 bg-emerald-400/10 text-7xl">
                🛡
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Bantuan
            </p>
            <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
              PERTANYAAN YANG SERING DITANYAKAN
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
                  Belum ada pertanyaan yang ditampilkan saat ini.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-5 rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(120deg,rgba(16,185,129,.12),rgba(56,189,248,.05))] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Transparan sebelum bayar
            </p>
            <h2 className="mt-2 text-2xl font-black italic">
              HARGA PRODUK, DISKON, DAN BIAYA DITAMPILKAN DI CHECKOUT
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Metode pembayaran yang tersedia akan ditampilkan dengan jelas saat checkout.
              Pembayaran otomatis akan hadir setelah proses pengujian selesai.
            </p>
          </div>
          <span className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-amber-200">
            Midtrans segera hadir
          </span>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
