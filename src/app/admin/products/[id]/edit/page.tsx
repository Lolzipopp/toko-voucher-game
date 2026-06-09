import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { updateProduct } from "../../actions";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type Game = {
  id: string;
  name: string;
};

type ProductAttribute = {
  attribute_key: string;
  attribute_value: string;
  display_order: number;
};

type Product = {
  id: string;
  game_id: string;
  name: string;
  product_code: string;
  product_type: string;
  price_normal: number;
  status: string;
  archived_at: string | null;
  product_attributes: ProductAttribute[];
};

export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  const { id } = await params;
  const query = await searchParams;
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

  const [{ data: productData, error: productError }, { data: gamesData }] =
    await Promise.all([
      supabase
        .from("products")
        .select(`
          id,
          game_id,
          name,
          product_code,
          product_type,
          price_normal,
          status,
          archived_at,
          product_attributes (
            attribute_key,
            attribute_value,
            display_order
          )
        `)
        .eq("id", id)
        .single(),
      supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (productError || !productData) {
    notFound();
  }

  const product = productData as Product;
  const games = (gamesData ?? []) as Game[];

  if (product.archived_at || product.status === "archived") {
    redirect(
      "/admin/products?error=" +
        encodeURIComponent("Produk yang sudah diarsipkan tidak dapat diedit."),
    );
  }

  const attributes = [...(product.product_attributes ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map(
      (attribute) =>
        `${attribute.attribute_key}=${attribute.attribute_value}`,
    )
    .join("\n");

  const updateAction = updateProduct.bind(null, product.id);

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
            className="rounded-xl border border-green-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
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
            Edit produk
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Perubahan akan dicatat ke audit log.
          </p>
        </div>

        <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm sm:p-7">
          {query.error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {query.error}
            </div>
          ) : null}

          <form action={updateAction} className="space-y-5">
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
                  defaultValue={product.game_id}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
                  defaultValue={product.product_type}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
                defaultValue={product.name}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
                  defaultValue={product.product_code}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm uppercase outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
                  defaultValue={product.price_normal}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
                defaultValue={product.status}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
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
                defaultValue={attributes}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-sm leading-6 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Satu baris satu atribut dengan format key=value.
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
                Simpan perubahan
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
