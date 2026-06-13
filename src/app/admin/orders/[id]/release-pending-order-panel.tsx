"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { releasePendingOrder } from "../actions";

type Props = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  activeReservationCount: number;
};

export default function ReleasePendingOrderPanel({
  orderId,
  orderStatus,
  paymentStatus,
  activeReservationCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const canRelease =
    ["pending", "processing"].includes(orderStatus) &&
    ["pending", "processing"].includes(paymentStatus);

  if (!canRelease) return null;

  function submit() {
    if (
      !window.confirm(
        "Batalkan order pending ini dan kembalikan semua stoknya menjadi tersedia? Tindakan ini tidak boleh dilakukan jika pembayaran sudah masuk.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await releasePendingOrder(orderId);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
        Lepaskan stok sekarang
      </p>
      <h2 className="mt-2 text-lg font-black text-slate-950">
        Batalkan order pending & kembalikan stok
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Gunakan jika pembeli batal atau tidak jadi membayar. {activeReservationCount} stok yang masih ditahan akan langsung kembali tersedia tanpa menunggu waktu habis.
      </p>

      {message ? (
        <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${message.ok ? "bg-white text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="mt-4 w-full rounded-2xl border border-amber-300 bg-white px-5 py-3.5 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {isPending ? "Mengembalikan stok..." : "Batalkan order & jadikan stok tersedia"}
      </button>
    </section>
  );
}
