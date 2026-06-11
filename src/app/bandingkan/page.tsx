"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import {
  clearCompare,
  getCompareProducts,
  removeCompare,
  type CompareProduct,
} from "@/lib/store-engagement/compare";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function ComparePage() {
  const [products, setProducts] = useState<CompareProduct[]>([]);

  useEffect(() => {
    const sync = () => setProducts(getCompareProducts());
    sync();
    window.addEventListener("riku-store:compare-change", sync);
    return () => window.removeEventListener("riku-store:compare-change", sync);
  }, []);

  const attributeKeys = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.attributes.map((a) => a.key)))),
    [products],
  );

  return (
    <main className="min-h-screen bg-[#06111e] text-white">
      <StoreHeader />
      <section className="border-b border-white/10 bg-[#0a1b2c]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[.2em] text-sky-300">Pilih lebih yakin</p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-4xl font-black italic">BANDINGKAN PRODUK</h1>
              <p className="mt-3 text-sm text-slate-400">Bandingkan maksimal 3 produk di perangkat ini.</p>
            </div>
            {products.length ? <button onClick={() => { clearCompare(); setProducts([]); }} className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black text-slate-300">Kosongkan</button> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {products.length ? (
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[.03]">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="w-44 p-4 text-xs uppercase tracking-wider text-slate-500">Detail</th>
                  {products.map((p) => (
                    <th key={p.id} className="min-w-56 p-4 align-top">
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1a2e]">
                        <div className="aspect-video bg-slate-900">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl">🎮</div>}</div>
                        <div className="p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">{p.gameName}</p>
                          <h2 className="mt-1 line-clamp-2 font-black">{p.name}</h2>
                          <p className="mt-3 text-lg font-black text-emerald-300">{rupiah(p.price)}</p>
                          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                            <Link href={`/products/${p.slug}`} className="rounded-xl bg-emerald-400 px-3 py-2.5 text-center text-xs font-black text-emerald-950">Lihat</Link>
                            <button onClick={() => { removeCompare(p.id); setProducts(getCompareProducts()); }} className="rounded-xl border border-red-400/30 px-3 py-2.5 text-xs font-black text-red-200">Hapus</button>
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["Harga normal", (p: CompareProduct) => rupiah(p.normalPrice)],
                  ["Stok", (p: CompareProduct) => p.availableStock > 0 ? `${p.availableStock} tersedia` : "Habis"],
                  ["Garansi", (p: CompareProduct) => `${p.warrantyDays} hari`],
                  ["Jenis", (p: CompareProduct) => p.productType === "mass" ? "Massal" : "Unik"],
                ].map(([label, fn]) => (
                  <tr key={String(label)} className="border-b border-white/8">
                    <th className="p-4 text-slate-400">{String(label)}</th>
                    {products.map((p) => <td key={p.id} className="p-4 font-bold text-slate-200">{(fn as (x: CompareProduct) => string)(p)}</td>)}
                  </tr>
                ))}
                {attributeKeys.map((key) => (
                  <tr key={key} className="border-b border-white/8">
                    <th className="p-4 capitalize text-slate-400">{key.replaceAll("_", " ")}</th>
                    {products.map((p) => <td key={p.id} className="p-4 text-slate-200">{p.attributes.find((a) => a.key === key)?.value ?? "-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.03] p-12 text-center">
            <div className="text-5xl">⇄</div>
            <h2 className="mt-4 text-2xl font-black">Belum ada produk untuk dibandingkan</h2>
            <p className="mt-2 text-sm text-slate-400">Tekan tombol Bandingkan pada kartu atau detail produk.</p>
            <Link href="/#produk" className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950">Lihat katalog</Link>
          </div>
        )}
      </section>
      <StoreFooter />
    </main>
  );
}
