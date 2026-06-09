"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createTestOrder, releaseExpiredTestOrders } from "./actions";

type TestProduct = {
  id: string;
  name: string;
  product_code: string;
  available_stock: number;
};

type TestOrderPanelProps = {
  products: TestProduct[];
};

export default function TestOrderPanel({ products }: TestOrderPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [email, setEmail] = useState("test-order@rikustore.local");
  const [minutes, setMinutes] = useState("20");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function submitTestOrder() {
    setMessage(null);
    startTransition(async () => {
      const result = await createTestOrder({
        productId,
        quantity: Number(quantity),
        customerEmail: email,
        reservationMinutes: Number(minutes),
      });

      setMessage({ type: result.ok ? "success" : "error", text: result.message });

      if (result.ok && result.orderId) {
        router.push(`/admin/orders/${result.orderId}`);
        router.refresh();
      }
    });
  }

  function releaseExpired() {
    setMessage(null);
    startTransition(async () => {
      const result = await releaseExpiredTestOrders();
      setMessage({ type: result.ok ? "success" : "error", text: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/70 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Internal testing only</p>
          <h2 className="mt-1 font-black text-slate-950">Order Dummy + Reservasi FIFO</h2>
          <p className="mt-1 text-xs text-slate-500">Tidak menagih uang dan tidak mengirim akun. Hanya untuk menguji transaksi stok.</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-lg font-bold text-amber-700 shadow-sm">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-amber-200/80 bg-white p-5">
          {message ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Produk aktif</label>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Pilih produk</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.product_code}) — {product.available_stock} available
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Jumlah</label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">Reservasi (menit)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold text-slate-600">Email pembeli dummy</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={releaseExpired}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Lepaskan reservasi expired
            </button>
            <button
              type="button"
              disabled={isPending || products.length === 0}
              onClick={submitTestOrder}
              className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0b2f21] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Memproses..." : "Buat order dummy"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
