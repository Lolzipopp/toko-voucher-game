"use client";

import Link from "next/link";
import { useEffect } from "react";

import { reportClientError } from "@/lib/observability/client-report";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error.message,
      digest: error.digest,
      source: "app-error",
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-16">
      <section className="w-full rounded-3xl border border-slate-700 bg-slate-950 p-6 text-center shadow-2xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
          RIKU STORE
        </p>
        <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">
          Halaman sedang mengalami kendala
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
          Data dan pesananmu tetap aman. Coba muat ulang halaman. Jika kendala berlanjut,
          hubungi admin melalui menu WhatsApp.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-slate-600 px-5 py-3 font-bold text-white transition hover:bg-slate-900"
          >
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
