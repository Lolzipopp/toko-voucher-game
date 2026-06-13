"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="id">
      <body className="m-0 min-h-screen bg-slate-950 font-sans text-white">
        <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-16">
          <section className="w-full rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
            <h1 className="text-3xl font-black">RIKU STORE sedang bermasalah</h1>
            <p className="mt-3 leading-7 text-slate-300">
              Silakan coba beberapa saat lagi. Pesanan yang sudah dibuat tetap tersimpan.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-2xl bg-emerald-400 px-6 py-3 font-black text-slate-950"
            >
              Muat ulang
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
