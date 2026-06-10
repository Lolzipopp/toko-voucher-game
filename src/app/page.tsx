import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/store/product-card";
import StoreHeader from "@/components/store/store-header";
import { createClient } from "@/lib/supabase/server";
import type { PublicCatalogProduct } from "@/lib/public-store/types";

export const metadata: Metadata = {
  title: "RIKU STORE — Akun Roblox Instan",
  description: "Akun Roblox dengan spesifikasi jelas, stok nyata, pengiriman instan, dan garansi tiga hari.",
};
export const dynamic = "force-dynamic";

type HomeProps = { searchParams: Promise<{ q?: string; game?: string }> };

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data, error }, { data: games }] = await Promise.all([
    supabase.rpc("get_public_catalog", { p_game_slug: query.game ?? null, p_search: query.q ?? null }),
    supabase.from("games").select("name, slug").eq("is_active", true).order("sort_order"),
  ]);
  if (error) throw new Error(`Gagal memuat katalog: ${error.message}`);
  const products = (data ?? []) as PublicCatalogProduct[];

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />
      <section className="relative overflow-hidden bg-[#103d2b] text-white">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">Akun Roblox • Instan • Bergaransi</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Cari akun, bayar, lalu langsung main.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">Spesifikasi jelas, stok nyata, pengiriman instan, dan garansi tiga hari dari RIKU STORE.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#produk" className="rounded-2xl bg-emerald-400 px-6 py-3.5 text-sm font-black text-emerald-950 shadow-xl shadow-black/15 transition hover:bg-emerald-300">Lihat produk</Link>
              <span className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white/80">Checkout tanpa login</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {[['⚡','Pengiriman instan'],['🛡️','Garansi 3 hari'],['🔒','Data aman'],['📦','Stok nyata']].map(([icon,label]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-2xl">{icon}</p><p className="mt-3 text-sm font-black">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produk" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Katalog</p><h2 className="mt-2 text-3xl font-black tracking-tight">Pilih akun yang cocok</h2><p className="mt-2 text-sm text-slate-500">{products.length} produk tersedia untuk ditelusuri.</p></div>
          <form className="flex w-full max-w-xl gap-2" action="/" method="get">
            {query.game ? <input type="hidden" name="game" value={query.game} /> : null}
            <input name="q" defaultValue={query.q ?? ""} placeholder="Cari level, fruit, sword, bonus..." className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
            <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">Cari</button>
          </form>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          <Link href={query.q ? `/?q=${encodeURIComponent(query.q)}` : "/"} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${!query.game ? 'bg-[#103d2b] text-white' : 'bg-white text-slate-600'}`}>Semua game</Link>
          {(games ?? []).map((game) => <Link key={game.slug} href={`/?game=${game.slug}${query.q ? `&q=${encodeURIComponent(query.q)}` : ''}#produk`} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${query.game === game.slug ? 'bg-[#103d2b] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{game.name}</Link>)}
        </div>
        {products.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="text-lg font-black">Produk tidak ditemukan</p><p className="mt-2 text-sm text-slate-500">Coba kata kunci lain atau lihat semua game.</p><Link href="/#produk" className="mt-5 inline-flex rounded-xl bg-[#103d2b] px-4 py-2.5 text-sm font-black text-white">Reset pencarian</Link></div>}
      </section>
      <footer className="border-t border-emerald-950/10 bg-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6"><p className="font-black text-slate-900">RIKU STORE</p><p>© 2026 • Akun Roblox instan dan bergaransi.</p></div></footer>
    </main>
  );
}
