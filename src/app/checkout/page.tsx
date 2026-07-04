"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { useCart } from "@/components/store/cart-provider";
import { formatRupiah, productImageUrl } from "@/lib/public-store/format";
import { createCheckoutOrder, getPendingCheckout, validatePromo, type PendingCheckoutResult, type PromoResult } from "./actions";

function calculatePakasirQrisGrossAmount(netAmount: number) {
  const net = Math.max(0, Math.round(netAmount));
  if (net <= 0) return { grossAmount: 0, feeAmount: 0 };

  let grossAmount = Math.ceil((net + 310) / 0.993);
  if (grossAmount > 105000) {
    grossAmount = Math.ceil(net / 0.99);
  }

  return {
    grossAmount,
    feeAmount: Math.max(0, grossAmount - net),
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, hydrated, clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<Extract<PromoResult, { ok: true }> | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<Extract<PendingCheckoutResult, { ok: true; hasPending: true }> | null>(null);
  const [replacePendingConfirmed, setReplacePendingConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isPromoPending, startPromoTransition] = useTransition();

  const checkoutItems = items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  const finalDiscount = appliedPromo?.discountAmount ?? 0;
  const productTotal = appliedPromo?.totalAmount ?? subtotal;
  const feeEstimate = calculatePakasirQrisGrossAmount(productTotal);
  const finalTotal = feeEstimate.grossAmount;

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
      setError("Centang dulu ya.");
      return;
    }
    startTransition(async () => {
      if (!replacePendingConfirmed) {
        const pending = await getPendingCheckout({ email });
        if (!pending.ok) {
          setError(pending.message);
          return;
        }
        if (pending.hasPending) {
          setPendingCheckout(pending);
          setError("Email ini masih punya pesanan yang belum dibayar. Pilih lanjutkan jika mau mengganti pesanan lama.");
          return;
        }
      }

      const result = await createCheckoutOrder({
        email,
        promoCode: appliedPromo?.code,
        items: checkoutItems,
        replacePending: replacePendingConfirmed,
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

        <div className="mt-3 space-y-3">
          {!hydrated ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500 shadow-sm">
              Loading produk...
            </div>
          ) : items.length ? (
            items.map((item) => {
              const imageUrl = productImageUrl(item.imagePath);

              return (
                <div key={item.productId} className="flex gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:items-center sm:p-4">
                  <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-24 sm:w-32">
                    {imageUrl ? (
                      <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${imageUrl})` }} />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-black text-slate-400">GAME</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black leading-snug text-slate-950 sm:text-base">{item.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">{item.gameName}</span>
                      {item.quantity > 1 ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Qty {item.quantity}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-black text-emerald-700">{formatRupiah(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>

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
                setPendingCheckout(null);
                setReplacePendingConfirmed(false);
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

            {pendingCheckout ? (
              <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-black">Email ini masih punya pesanan belum dibayar.</p>
                <p className="mt-2 text-xs leading-5">
                  Pesanan lama: <b>{pendingCheckout.orderNumber}</b> · Total {formatRupiah(pendingCheckout.totalAmount)}.
                  Kalau lanjut bikin pesanan baru, semua pesanan lama yang belum dibayar dengan email ini akan dibatalkan dan link bayar lama tidak dipakai lagi.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingCheckout(null);
                      setError(null);
                    }}
                    className="rounded-2xl border border-amber-300 bg-white px-4 py-3 text-xs font-black text-amber-800"
                  >
                    Batal dulu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacePendingConfirmed(true);
                      setPendingCheckout(null);
                      setError(null);
                    }}
                    className="rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-white"
                  >
                    Buat pesanan baru, batalkan yang lama
                  </button>
                </div>
              </div>
            ) : null}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
              <span className="text-xs leading-5 text-slate-600">Saya sudah memeriksa detail akun dan paham pesanan yang belum dibayar bisa diganti kalau membuat pesanan baru dengan email yang sama.</span>
            </label>

          </section>

          <aside className="h-fit min-w-0 overflow-hidden rounded-3xl bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10 lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Total bayar</p>

            {!hydrated ? <p className="mt-5 text-sm text-white/60">Loading...</p> : items.length === 0 ? (
              <div className="mt-5"><p className="text-sm font-bold">Belum ada produk di pesanan.</p><Link href="/#produk" className="mt-4 inline-flex text-sm font-black text-emerald-300">Pilih akun</Link></div>
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
                  <div className="flex justify-between text-white/65"><dt>Biaya layanan QRIS</dt><dd>{formatRupiah(feeEstimate.feeAmount)}</dd></div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4"><dt className="font-bold">Total bayar</dt><dd className="text-xl font-black text-emerald-300">{formatRupiah(finalTotal)}</dd></div>
                </dl>

                <button type="button" disabled={isPending || items.length === 0 || !email.trim()} onClick={submitCheckout} className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">
                  {isPending ? "Membuat pesanan..." : `Buat pesanan · ${formatRupiah(finalTotal)}`}
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
