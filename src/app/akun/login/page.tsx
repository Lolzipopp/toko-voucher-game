import Link from "next/link";
import { redirect } from "next/navigation";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { createClient } from "@/lib/supabase/server";

import {
  sendCustomerOtp,
  verifyCustomerOtp,
} from "../actions";

type Props = {
  searchParams: Promise<{
    step?: string;
    email?: string;
    error?: string;
    sent?: string;
    next?: string;
    mode?: string;
  }>;
};

export default async function CustomerLoginPage({
  searchParams,
}: Props) {
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(query.next?.startsWith("/") ? query.next : "/akun");
  }

  const verifyStep = query.step === "verify" && Boolean(query.email);
  const mode = query.mode === "register" ? "register" : "login";
  const next =
    query.next?.startsWith("/") && !query.next.startsWith("//")
      ? query.next
      : "/akun";

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />

      <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
        <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#103d2b] text-3xl text-white">
            ✉
          </div>

          <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Akun Pembeli
          </p>

          <h1 className="mt-2 text-center text-3xl font-black">
            {verifyStep
              ? "Masukkan kode dari email"
              : mode === "register"
                ? "Daftar akun pembeli"
                : "Masuk ke akun pembeli"}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-500">
            {verifyStep
              ? `Kami mengirim kode masuk ke ${query.email}.`
              : mode === "register"
                ? "Daftar gratis menggunakan email. Tidak perlu membuat password."
                : "Masukkan email yang pernah dipakai checkout agar semua pesananmu terhubung."}
          </p>

          {!verifyStep ? (
            <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <Link
                href={`/akun/login?mode=login&next=${encodeURIComponent(next)}`}
                className={`rounded-xl px-4 py-3 text-center text-sm font-black transition ${mode === "login" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500"}`}
              >
                Masuk
              </Link>
              <Link
                href={`/akun/login?mode=register&next=${encodeURIComponent(next)}`}
                className={`rounded-xl px-4 py-3 text-center text-sm font-black transition ${mode === "register" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500"}`}
              >
                Daftar gratis
              </Link>
            </div>
          ) : null}

          {query.sent ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Kode berhasil dikirim. Periksa inbox dan folder spam.
            </div>
          ) : null}

          {query.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {query.error}
            </div>
          ) : null}

          {!verifyStep ? (
            <form action={sendCustomerOtp} className="mt-6 space-y-4">
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="mode" value={mode} />

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="emailkamu@gmail.com"
                  className={inputClass}
                />
              </div>

              <button className="w-full rounded-2xl bg-[#103d2b] px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-800">
                {mode === "register" ? "Kirim kode pendaftaran" : "Kirim kode masuk"}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <form action={verifyCustomerOtp} className="space-y-4">
                <input type="hidden" name="email" value={query.email} />
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="mode" value={mode} />

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Kode dari email
                  </label>
                  <input
                    name="token"
                    inputMode="numeric"
                    pattern="[0-9]{6,10}"
                    minLength={6}
                    maxLength={10}
                    required
                    autoComplete="one-time-code"
                    placeholder="Masukkan kode"
                    className={`${inputClass} text-center font-mono text-2xl font-black tracking-[0.35em]`}
                  />
                </div>

                <button className="w-full rounded-2xl bg-[#103d2b] px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-800">
                  Verifikasi dan masuk
                </button>
              </form>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <form action={sendCustomerOtp}>
                  <input type="hidden" name="email" value={query.email} />
                  <input type="hidden" name="next" value={next} />
                  <input type="hidden" name="mode" value={mode} />
                  <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50">
                    Kirim ulang
                  </button>
                </form>

                <Link
                  href={`/akun/login?mode=${mode}&next=${encodeURIComponent(next)}`}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  Ganti email
                </Link>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Setelah verifikasi, semua pesanan yang memakai email ini otomatis
            terhubung ke akunmu.
          </p>
        </section>
      </div>
          <StoreFooter />
</main>
  );
}
