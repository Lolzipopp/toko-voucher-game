import type { Metadata } from "next";
import Link from "next/link";

import HomeBannerCarousel, { type HomeBanner } from "@/components/store/home-banner-carousel";
import ProductCard from "@/components/store/product-card";
import ProductSearchForm from "@/components/store/product-search-form";
import SectionLink from "@/components/store/section-link";
import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import RecentlyViewedSection from "@/components/store/recently-viewed-section";
import { getPublicStoreSettings, whatsappUrl } from "@/lib/public-store/settings";
import { createClient } from "@/lib/supabase/server";
import type { PublicCatalogProduct } from "@/lib/public-store/types";

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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productMatchesSearch(product: PublicCatalogProduct, rawQuery?: string) {
  const normalizedQuery = normalizeSearchText(rawQuery ?? "");
  if (!normalizedQuery) return true;

  const searchableText = normalizeSearchText(
    [
      product.name,
      product.description ?? "",
      product.game.name,
      product.game.slug,
      ...product.attributes.flatMap((attribute) => [attribute.key, attribute.value]),
    ].join(" "),
  );

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableText.includes(term));
}


export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const [
    { data, error },
    { data: games },
    settings,
    { data: announcements },
    { data: testimonials },
    { data: faqItems },
  ] = await Promise.all([
    supabase.rpc("get_public_catalog", {
      p_game_slug: query.game ?? null,
      p_search: query.q ?? null,
    }),
    supabase
      .from("games")
      .select("name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    getPublicStoreSettings(),
    supabase
      .from("site_announcements")
      .select("id, title, message, button_label, button_url, tone, image_path")
      .order("sort_order")
      .limit(3),
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

      <HomeBannerCarousel
        whatsappUrl={whatsapp}
        banners={(announcements ?? []).map((announcement) => {
          const imagePath = announcement.image_path as string | null;
          const imageUrl = imagePath
            ? supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl
            : null;

          return {
            id: announcement.id,
            title: announcement.title,
            message: announcement.message,
            button_label: announcement.button_label,
            button_url:
              announcement.button_label?.toLowerCase().includes("hubungi admin") && whatsapp
                ? whatsapp
                : announcement.button_url,
            tone: announcement.tone,
            image_url: imageUrl,
          } satisfies HomeBanner;
        })}
      />

      <section
        id="kebutuhan"
        className="scroll-mt-20 mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12 lg:py-16"
      >
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
            Layanan RIKU STORE
          </p>
          <h2 className="mt-3 text-3xl font-black italic sm:text-4xl">
            PILIH KEBUTUHANMU
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:mt-8 sm:gap-4">
          <SectionLink
            href="/#produk"
            className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-emerald-400/25 bg-[radial-gradient(circle_at_80%_0%,rgba(52,211,153,.18),transparent_45%),#0a1a2e] px-2 py-4 text-center transition hover:-translate-y-1 hover:border-emerald-300/60 sm:min-h-72 sm:items-start sm:justify-start sm:rounded-3xl sm:p-6 sm:text-left"
          >
            <span className="text-3xl sm:text-4xl">🎮</span>
            <h3 className="mt-2 text-[11px] font-black italic leading-tight sm:mt-7 sm:text-xl">BELI AKUN</h3>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Cari akun berdasarkan game, harga, dan spesifikasi.
            </p>
            <span className="mt-2 text-[9px] font-black uppercase tracking-wide text-emerald-300 sm:mt-6 sm:text-xs sm:tracking-wider">
              Lihat →
            </span>
          </SectionLink>

          <SectionLink
            href="/#exclusive-offer"
            className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-amber-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(251,191,36,.16),transparent_45%),#0a1a2e] px-2 py-4 text-center transition hover:-translate-y-1 hover:border-amber-300/55 sm:min-h-72 sm:items-start sm:justify-start sm:rounded-3xl sm:p-6 sm:text-left"
          >
            <span className="text-3xl sm:text-4xl">🎁</span>
            <h3 className="mt-2 text-[11px] font-black italic leading-tight sm:mt-7 sm:text-xl">PROMO</h3>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Cek akun dengan harga khusus yang sedang aktif.
            </p>
            <span className="mt-2 text-[9px] font-black uppercase tracking-wide text-amber-300 sm:mt-6 sm:text-xs sm:tracking-wider">
              Cek →
            </span>
          </SectionLink>

          <Link
            href="/akun"
            className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(56,189,248,.16),transparent_45%),#0a1a2e] px-2 py-4 text-center transition hover:-translate-y-1 hover:border-sky-300/55 sm:min-h-72 sm:items-start sm:justify-start sm:rounded-3xl sm:p-6 sm:text-left"
          >
            <span className="text-3xl sm:text-4xl">🔐</span>
            <h3 className="mt-2 text-[11px] font-black italic leading-tight sm:mt-7 sm:text-xl">PESANAN</h3>
            <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
              Masuk lewat email untuk melihat order dan data akun.
            </p>
            <span className="mt-2 text-[9px] font-black uppercase tracking-wide text-sky-300 sm:mt-6 sm:text-xs sm:tracking-wider">
              Buka →
            </span>
          </Link>

          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-violet-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(167,139,250,.16),transparent_45%),#0a1a2e] px-2 py-4 text-center transition hover:-translate-y-1 hover:border-violet-300/55 sm:min-h-72 sm:items-start sm:justify-start sm:rounded-3xl sm:p-6 sm:text-left"
            >
              <span className="text-3xl sm:text-4xl">💬</span>
              <h3 className="mt-2 text-[11px] font-black italic leading-tight sm:mt-7 sm:text-xl">JUAL / CARI</h3>
              <p className="mt-2 hidden text-sm leading-6 text-slate-400 sm:block">
                Hubungi admin untuk menjual akun atau mencari spesifikasi khusus.
              </p>
              <span className="mt-2 text-[9px] font-black uppercase tracking-wide text-violet-300 sm:mt-6 sm:text-xs sm:tracking-wider">
                Chat →
              </span>
            </a>
          ) : (
            <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#091625] px-2 py-4 text-center opacity-70 sm:min-h-72 sm:items-start sm:justify-start sm:rounded-3xl sm:p-6 sm:text-left">
              <span className="text-3xl sm:text-4xl">💬</span>
              <h3 className="mt-2 text-[11px] font-black italic leading-tight sm:mt-7 sm:text-xl">JUAL / CARI</h3>
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
        className="scroll-mt-20 mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-14 lg:py-20"
      >
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Pilihan stok
            </p>
            <h2 className="mt-2 text-3xl font-black italic sm:text-4xl">
              AKUN YANG TERSEDIA
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              {query.q ? (
                <>
                  {displayedProducts.length} hasil untuk “{query.q}” · {totalAvailableStock} akun tersedia
                </>
              ) : (
                <>
                  {availableProducts.length} produk aktif dengan total {totalAvailableStock} akun tersedia.
                </>
              )}
            </p>
          </div>

          <ProductSearchForm initialQuery={query.q} game={query.game} />
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
          <Link
            href={query.q ? `/?q=${encodeURIComponent(query.q)}` : "/"}
            className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-xs font-black ${
              !query.game
                ? "border-emerald-400 bg-emerald-400 text-emerald-950 shadow-[0_0_20px_rgba(52,211,153,.18)]"
                : "border-white/10 bg-white/5 text-slate-300"
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
                  : "border-white/10 bg-white/5 text-slate-300"
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

      {(testimonials ?? []).length ? (
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
          </div>
        </section>
      ) : null}

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
