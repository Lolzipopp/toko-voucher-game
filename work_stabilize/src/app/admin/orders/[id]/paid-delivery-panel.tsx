"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { simulateTestPaidDelivery } from "../actions";

type PaidDeliveryPanelProps = {
  orderId: string;
  isTestOrder: boolean;
  paymentStatus: string;
  deliveryStatus: string;
};

export default function PaidDeliveryPanel({
  orderId,
  isTestOrder,
  paymentStatus,
  deliveryStatus,
}: PaidDeliveryPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!isTestOrder) return null;

  const alreadyDelivered =
    paymentStatus === "paid" && deliveryStatus === "delivered";

  function runSimulation() {
    setMessage(null);

    startTransition(async () => {
      const result = await simulateTestPaidDelivery(orderId);

      setMessage({
        type: result.ok ? "success" : "error",
        text: result.message,
      });

      router.refresh();
    });
  }

  return (
    <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
        Internal Payment Test
      </p>
      <h2 className="mt-2 text-lg font-black text-slate-950">
        Simulasi Paid + Auto-Delivery
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Khusus order dummy. Proses ini mengubah payment menjadi paid,
        mengonversi stok reserved menjadi sold, memulai garansi, dan aman
        diklik ulang tanpa menjual stok dua kali.
      </p>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-white text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          Payment: {paymentStatus} · Delivery: {deliveryStatus}
        </p>

        <button
          type="button"
          disabled={isPending}
          onClick={runSimulation}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Memproses..."
            : alreadyDelivered
              ? "Tes idempotency (klik ulang)"
              : "Simulasikan Paid & Delivery"}
        </button>
      </div>
    </section>
  );
}
