"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { confirmManualPaymentAndDeliver } from "../actions";

type Props = {
  orderId: string;
  paymentStatus: string;
  deliveryStatus: string;
  isPublicOrder: boolean;
};

export default function ManualPaymentPanel({
  orderId,
  paymentStatus,
  deliveryStatus,
  isPublicOrder,
}: Props) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isPublicOrder) return null;

  const alreadyDelivered =
    paymentStatus === "paid" &&
    deliveryStatus === "delivered";

  function submit() {
    if (
      !alreadyDelivered &&
      !window.confirm(
        "Pastikan uang pembeli benar-benar sudah masuk. Lanjutkan konfirmasi dan kirim akun?",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await confirmManualPaymentAndDeliver({
        orderId,
        paymentReference: reference,
        adminNotes: notes,
      });

      setMessage({
        ok: result.ok,
        text: result.message,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
        Pembayaran Manual
      </p>

      <h2 className="mt-2 text-lg font-black text-slate-950">
        Konfirmasi pembayaran & kirim akun
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Gunakan hanya setelah kamu memeriksa mutasi bank atau
        e-wallet dan memastikan pembayaran pembeli benar-benar
        masuk.
      </p>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
            message.ok
              ? "border-emerald-200 bg-white text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600">
            Referensi pembayaran
          </label>
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Contoh: BCA 11/06 14:30"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600">
            Catatan admin
          </label>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Opsional"
            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="mt-4 w-full rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isPending
          ? "Memproses..."
          : alreadyDelivered
            ? "Periksa status pengiriman"
            : "Pembayaran sudah masuk — kirim akun"}
      </button>
    </section>
  );
}
