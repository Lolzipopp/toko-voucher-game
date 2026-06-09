import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createProduct } from "../actions";

type NewProductPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type Game = {
  id: string;
  name: string;
};

export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) {
    redirect("/admin/login");
  }

  const { data, error } = await supabase
    .from("games")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil daftar game: ${error.message}`);
  }

  const games = (data ?? []) as Game[];

  return (
    <main className="min-h-screen bg-green-50">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">
              RIKU STORE
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {admin.full_name || admin.email} · {admin.role}
            </p>
          </div>

          <Link
            href="/admin/products"
            className="rounded-xl border border-green-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
          >
            Batal
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">
            Manajemen Produk
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Produk baru
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Buat produk massal atau unik. Stok akun dimasukkan setelah produk
            berhasil dibuat.
          </p>
        </div>

        <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm sm:p-7">
          {params.error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}

          {games.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tidak ada game aktif. Aktifkan minimal satu game terlebih dahulu.
            </div>
          ) : (
            <form action={createProduct} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="game_id"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Game
                  </label>
                  <select
                    id="game_id"
                    name="game_id"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                  >
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="product_type"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Tipe produk
                  </label>
                  <select
                    id="product_type"
                    name="product_type"
                    required
                    defaultValue="mass"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                  >
                    <option value="mass">Massal — banyak stok akun</option>
                    <option value="unique">Unik — satu akun khusus</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Nama produk
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Akun Blox Fruits Level Max"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="product_code"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Kode produk
                  </label>
                  <input
                    id="product_code"
                    name="product_code"
                    type="text"
                    required
                    placeholder="BF-MAX-001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm uppercase text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="price_normal"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Harga IDR
                  </label>
                  <input
                    id="price_normal"
                    name="price_normal"
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="15000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  defaultValue="active"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                >
                  <option value="active">Aktif</option>
                  <option value="draft">Draft</option>
                  <option value="preorder">Preorder</option>
                  <option value="out_of_stock">Habis</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="attributes"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Atribut produk
                </label>
                <textarea
                  id="attributes"
                  name="attributes"
                  rows={7}
                  placeholder={"level=2800\nfighting_style=Godhuman\nsword=CDK\nbonus=Jika hoki"}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-sm leading-6 text-slate-900 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                  Satu baris satu atribut dengan format key=value. Tidak boleh
                  ada key yang sama.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Link
                  href="/admin/products"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
                >
                  Simpan produk
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
