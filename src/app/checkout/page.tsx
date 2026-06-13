"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { useCart } from "@/components/store/cart-provider";
import { formatRupiah } from "@/lib/public-store/format";
import { createCheckoutOrder, validatePromo, type PromoResult } from "./actions";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, hydrated, clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<Extract<PromoResult, { ok: true }> | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPromoPending, startPromoTransition] = useTransition();

  const checkoutItems = items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  const finalDiscount = appliedPromo?.discountAmount ?? 0;
  const finalTotal = appliedPromo?.totalAmount ?? subtotal;

  function applyPromo() {
    setError(null);
    setPromoMessage(null);
    startPromoTransition(async () => {
      const result = await validatePromo({ email, promoCode, items: checkoutItems });
      if (!result.ok) {
        setAppliedPromo(null);
        setPromoMessage(result.message);
        return;
      }
      setAppliedPromo(result);
      setPromoCode(result.code);
      setPromoMessage(`Promo ${result.code} berhasil dipakai.`);
    });
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoMessage(null);
  }

  function submitCheckout() {
    setError(null);
    if (!agreed) {
      setError("Centang persetujuan ketentuan pembelian terlebih dahulu.");
      return;
    }
    startTransition(async () => {
      const result = await createCheckoutOrder({
        email,
        promoCode: appliedPromo?.code,
        items: checkoutItems,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      clearCart();
      router.push(`/checkout/success/${result.accessToken}`);
    });
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-[#f7fbf8] text-slate-950">
      <StoreHeader />
      <div className="mx-auto w-full min-w-0 max-w-5xl px-3 py-6 sm:px-6 sm:py-8 lg:py-12">
        <Link href="/cart" className="text-sm font-bold text-emerald-700">← Kembali ke keranjang</Link>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-6">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Checkout tanpa login</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Data pembeli</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Email ini dipakai untuk menghubungkan pesanan ke akun pembeli dan mengirim status pesanan.</p>

            {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

            <label className="mt-6 block text-xs font-black uppercase tracking-wider text-slate-500">Email aktif</label>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (appliedPromo) removePromo();
              }}
              placeholder="nama@email.com"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />

            <div className="mt-5 min-w-0 overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-800">Kode promo</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setAppliedPromo(null);
                    setPromoMessage(null);
                  }}
                  placeholder="Contoh: RIKU10"
                  className="min-w-0 flex-1 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black uppercase outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
                {appliedPromo ? (
                  <button type="button" onClick={removePromo} className="rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-600">Hapus</button>
                ) : (
                  <button type="button" disabled={isPromoPending || !promoCode.trim() || !email.trim() || items.length === 0} onClick={applyPromo} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                    {isPromoPending ? "Memeriksa..." : "Pakai promo"}
                  </button>
                )}
              </div>
              {promoMessage ? <p className={`mt-2 text-xs font-bold ${appliedPromo ? "text-emerald-700" : "text-red-600"}`}>{promoMessage}</p> : null}
              {appliedPromo?.description ? <p className="mt-1 text-xs text-slate-500">{appliedPromo.description}</p> : null}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
              <span className="text-xs leading-5 text-slate-600">Saya sudah membaca spesifikasi produk dan memahami bahwa pembayaran otomatis belum tersedia. Setelah pesanan dibuat, saya akan menghubungi admin melalui WhatsApp sebelum waktu pesanan habis.</span>
            </label>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              Pembayaran otomatis belum tersedia. Setelah order dibuat,
              kamu akan diarahkan untuk menghubungi admin melalui WhatsApp.
              Harga, promo, total, dan stok tetap diverifikasi oleh sistem.
            </div>
          </section>

          <aside className="h-fit min-w-0 overflow-hidden rounded-3xl bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10 lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Ringkasan pembayaran</p>

            {!hydrated ? <p className="mt-5 text-sm text-white/60">Memuat keranjang...</p> : items.length === 0 ? (
              <div className="mt-5"><p className="text-sm font-bold">Keranjang kosong.</p><Link href="/#produk" className="mt-4 inline-flex text-sm font-black text-emerald-300">Pilih produk</Link></div>
            ) : (
              <>
                <div className="mt-5 max-h-72 space-y-3 overflow-auto pr-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between gap-3 border-b border-white/10 pb-3 text-sm">
                      <div className="min-w-0"><p className="truncate font-bold">{item.name}</p><p className="mt-1 text-xs text-white/50">{item.quantity} × {formatRupiah(item.unitPrice)}</p></div>
                      <p className="flex-shrink-0 font-black">{formatRupiah(item.unitPrice * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <dl className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
                  <div className="flex justify-between text-white/65"><dt>Subtotal</dt><dd>{formatRupiah(appliedPromo?.subtotal ?? subtotal)}</dd></div>
                  <div className="flex justify-between text-emerald-300"><dt>Diskon{appliedPromo ? ` (${appliedPromo.code})` : ""}</dt><dd>-{formatRupiah(finalDiscount)}</dd></div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4"><dt className="font-bold">Total pembayaran</dt><dd className="text-xl font-black text-emerald-300">{formatRupiah(finalTotal)}</dd></div>
                </dl>

                <button type="button" disabled={isPending || items.length === 0 || !email.trim()} onClick={submitCheckout} className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">
                  {isPending ? "Membuat pesanan..." : `Buat pesanan & lanjut WhatsApp · ${formatRupiah(finalTotal)}`}
                </button>
              </>
            )}
          </aside>
        </div>
      </div>
          <StoreFooter />
</main>
  );
}
