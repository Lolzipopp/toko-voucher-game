import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-16">
      <section className="w-full rounded-3xl border border-slate-700 bg-slate-950 p-7 text-center shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">404</p>
        <h1 className="mt-3 text-3xl font-black text-white">Halaman tidak ditemukan</h1>
        <p className="mt-3 leading-7 text-slate-300">
          Link mungkin sudah berubah atau produk sudah tidak tersedia.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-6 py-3 font-black text-slate-950"
        >
          Lihat produk tersedia
        </Link>
      </section>
    </main>
  );
}
