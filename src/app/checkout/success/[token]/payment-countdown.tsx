"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CheckoutStatus = {
  ok: boolean;
  state:
    | "awaiting_payment"
    | "paid"
    | "delivered"
    | "expired"
    | "failed"
    | "error";
  order_number?: string;
  subtotal?: number;
  discount_amount?: number;
  total_amount?: number;
  promo_code?: string | null;
  order_status?: string;
  payment_status?: string;
  delivery_status?: string;
  payment_expires_at?: string | null;
  server_now?: string;
  message?: string;
};

type Props = {
  token: string;
  initialStatus: CheckoutStatus;
};

function formatRupiah(value = 0) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function secondsRemaining(expiresAt?: string | null) {
  if (!expiresAt) return 0;
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PaymentCountdown({
  token,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [remaining, setRemaining] = useState(() =>
    secondsRemaining(initialStatus.payment_expires_at),
  );
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(token)}/payment-status`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      const result = (await response.json()) as CheckoutStatus;
      setStatus(result);
      setRemaining(secondsRemaining(result.payment_expires_at));
    } catch {
      setStatus((current) => ({
        ...current,
        state: "error",
        message: "Status belum dapat diperbarui. Coba lagi.",
      }));
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (status.state !== "awaiting_payment") return;

    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    const poller = window.setInterval(refreshStatus, 5000);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(poller);
    };
  }, [refreshStatus, status.state]);

  useEffect(() => {
    if (status.state === "awaiting_payment" && remaining === 0) {
      void refreshStatus();
    }
  }, [refreshStatus, remaining, status.state]);

  const content = useMemo(() => {
    switch (status.state) {
      case "delivered":
        return {
          icon: "✓",
          eyebrow: "Pesanan siap",
          title: "Akunmu sudah siap dilihat",
          description:
            "Pembayaran berhasil dan akun sudah dikirim dengan aman.",
          tone: "emerald",
        };
      case "paid":
        return {
          icon: "✓",
          eyebrow: "Pembayaran berhasil",
          title: "Pesanan sedang diproses",
          description:
            "Tunggu sebentar. Sistem sedang menyiapkan akunmu.",
          tone: "emerald",
        };
      case "expired":
        return {
          icon: "⌛",
          eyebrow: "Waktu pembayaran habis",
          title: "Pesanan otomatis dibatalkan",
          description:
            "Silakan kembali ke katalog dan buat pesanan baru.",
          tone: "red",
        };
      case "failed":
        return {
          icon: "!",
          eyebrow: "Pembayaran gagal",
          title: "Pesanan belum berhasil",
          description:
            "Silakan buat pesanan baru atau hubungi admin bila uang sudah terpotong.",
          tone: "red",
        };
      case "error":
        return {
          icon: "?",
          eyebrow: "Gagal memperbarui status",
          title: "Coba periksa lagi",
          description:
            status.message ?? "Status pesanan belum dapat diperbarui.",
          tone: "amber",
        };
      default:
        return {
          icon: "⏱",
          eyebrow: "Menunggu pembayaran",
          title: "Harap selesaikan pembayaran dalam 20 menit",
          description:
            "Kalau waktu habis, pesanan otomatis dibatalkan.",
          tone: "amber",
        };
    }
  }, [status]);

  const toneClasses =
    content.tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : content.tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <section className="rounded-[32px] border border-emerald-200 bg-white p-6 text-center shadow-xl shadow-emerald-950/8 sm:p-10">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border text-3xl ${toneClasses}`}
      >
        {content.icon}
      </div>

      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
        {content.eyebrow}
      </p>

      <h1 className="mt-2 text-3xl font-black tracking-tight">
        {content.title}
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
        {content.description}
      </p>

      {status.state === "awaiting_payment" ? (
        <div className="mx-auto mt-7 max-w-sm rounded-3xl bg-[#103d2b] px-5 py-6 text-white shadow-xl shadow-emerald-950/15">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
            Sisa waktu pembayaran
          </p>
          <p className="mt-2 font-mono text-5xl font-black tracking-tight">
            {formatTimer(remaining)}
          </p>
        </div>
      ) : null}

      {status.discount_amount && status.discount_amount > 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Promo {status.promo_code ?? ""} menghemat {formatRupiah(status.discount_amount)}. Total awal {formatRupiah(status.subtotal)}.
        </div>
      ) : null}

      <dl className="mt-7 grid gap-3 rounded-3xl bg-slate-50 p-5 text-left sm:grid-cols-3">
        <div>
          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Nomor order
          </dt>
          <dd className="mt-1 break-all text-sm font-black">
            {status.order_number ?? "-"}
          </dd>
        </div>

        <div>
          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total
          </dt>
          <dd className="mt-1 text-sm font-black text-emerald-700">
            {formatRupiah(status.total_amount)}
          </dd>
        </div>

        <div>
          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Status
          </dt>
          <dd className="mt-1 text-sm font-black">
            {status.state === "awaiting_payment"
              ? "Menunggu pembayaran"
              : status.state === "delivered"
                ? "Akun siap dilihat"
                : status.state === "paid"
                  ? "Sedang diproses"
                  : status.state === "expired"
                    ? "Kedaluwarsa"
                    : "Perlu diperiksa"}
          </dd>
        </div>
      </dl>

      {status.state === "awaiting_payment" ? (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm text-blue-800">
          Payment gateway belum diaktifkan pada mode pengujian. Setelah
          terhubung, tombol dan QR pembayaran akan muncul di bagian ini.
        </div>
      ) : null}

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {status.state === "delivered" ? (
          <Link
            href={`/order/${token}`}
            className="rounded-2xl bg-[#103d2b] px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Lihat akun saya
          </Link>
        ) : null}

        {status.state === "expired" || status.state === "failed" ? (
          <Link
            href="/#produk"
            className="rounded-2xl bg-[#103d2b] px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Buat pesanan baru
          </Link>
        ) : null}

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void refreshStatus()}
          className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? "Memeriksa..." : "Periksa status"}
        </button>

        <Link
          href="/#produk"
          className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
        >
          Kembali ke katalog
        </Link>
      </div>
    </section>
  );
}
