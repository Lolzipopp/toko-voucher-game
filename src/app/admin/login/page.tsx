import { loginAdmin } from "./actions";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#07140f] px-4 py-10 lg:grid-cols-2 lg:px-8">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-green-300/10 blur-3xl" />

      <section className="relative hidden items-end p-10 lg:flex">
        <div className="max-w-xl pb-10">
          <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-lg">🎮</span>
            <div><p className="text-sm font-black tracking-[0.2em]">RIKU STORE</p><p className="text-xs text-white/40">Admin Control Center</p></div>
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tight text-white">Kelola toko digitalmu dengan lebih cepat dan aman.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/45">Produk, stok akun terenkripsi, dan operasional toko berada dalam satu dashboard yang terstruktur.</p>
          <div className="mt-10 flex gap-8 text-sm"><div><p className="font-black text-emerald-300">Encrypted</p><p className="mt-1 text-white/35">Credential storage</p></div><div><p className="font-black text-emerald-300">Role based</p><p className="mt-1 text-white/35">Admin access</p></div></div>
        </div>
      </section>

      <section className="relative flex items-center justify-center">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 shadow-2xl shadow-black/35 sm:p-8">
          <div className="lg:hidden"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#103d2b] text-xl">🎮</span></div>
          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 lg:mt-0">Secure access</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Masuk ke admin</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun yang terdaftar sebagai admin aktif RIKU STORE.</p>

          {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

          <form action={loginAdmin} className="mt-7 space-y-5">
            <div><label htmlFor="email" className="mb-2 block text-xs font-bold text-slate-600">Email admin</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="rikustore3@gmail.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></div>
            <div><label htmlFor="password" className="mb-2 block text-xs font-bold text-slate-600">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Masukkan password" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></div>
            <button type="submit" className="w-full rounded-2xl bg-[#103d2b] py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-950/15 transition hover:bg-[#0b2f21]">Masuk ke dashboard</button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">Akses dibatasi untuk owner dan admin operasional yang aktif.</p>
        </div>
      </section>
    </main>
  );
}
