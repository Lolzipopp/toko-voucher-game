import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { logoutAdmin } from "./actions";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (adminError || !admin || !admin.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-green-50">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">
              RIKU STORE
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {admin.full_name || admin.email} · {admin.role}
            </p>
          </div>

          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto">
          <Link
            href="/admin"
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/products"
            className="rounded-xl border border-green-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
          >
            Produk
          </Link>

          <Link
            href="/admin/inventory"
            className="rounded-xl border border-green-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
          >
            Stok
          </Link>
        </nav>

        <section className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">
            Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Admin dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Kelola produk dan stok RIKU STORE.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/products"
              className="rounded-2xl border border-green-100 bg-green-50 p-4 transition hover:border-green-300 hover:bg-green-100"
            >
              <p className="text-sm font-bold text-slate-900">Kelola Produk</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Tambah, edit, dan arsipkan produk.
              </p>
            </Link>

            <Link
              href="/admin/inventory"
              className="rounded-2xl border border-green-100 bg-green-50 p-4 transition hover:border-green-300 hover:bg-green-100"
            >
              <p className="text-sm font-bold text-slate-900">Kelola Stok</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Bulk paste, filter, dan ubah status stok.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
