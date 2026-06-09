import { loginAdmin } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-green-500/15 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-green-400 to-green-700 text-3xl shadow-2xl shadow-green-500/20">
            🎮
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            RIKU STORE
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Secure Admin Dashboard
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-xl">
          <div className="rounded-[22px] bg-white p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
              Admin Access
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Selamat datang kembali
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Masuk menggunakan akun admin RIKU STORE.
            </p>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form action={loginAdmin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Email admin
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="rikustore3@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
              >
                Masuk
              </button>
            </form>

            <p className="mt-5 text-center text-[10px] leading-5 text-slate-400">
              Akses hanya diberikan kepada akun yang terdaftar sebagai admin
              aktif.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}