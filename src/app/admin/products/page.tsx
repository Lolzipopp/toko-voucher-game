import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { archiveProduct } from "./actions";

type ProductsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type ProductAttribute = {
  attribute_key: string;
  attribute_value: string;
  display_order: number;
};

type Product = {
  id: string;
  name: string;
  product_code: string;
  product_type: string;
  price_normal: number;
  status: string;
  archived_at: string | null;
  games:
    | {
        name: string;
      }[]
    | null;
  product_attributes: ProductAttribute[];
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusClasses(status: string) {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "preorder":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "out_of_stock":
      return "border-red-200 bg-red-50 text-red-700";
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-500";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default async function AdminProductsPage({
  searchParams,
}: ProductsPageProps) {
  const query = await searchParams;
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

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        product_code,
        product_type,
        price_normal,
        status,
        archived_at,
        games (
          name
        ),
        product_attributes (
          attribute_key,
          attribute_value,
          display_order
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil produk: ${error.message}`);
  }

  const products = (data ?? []) as Product[];

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

          <Link
            href="/admin"
            className="rounded-xl border border-green-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
          >
            Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto">
          <Link
            href="/admin"
            className="rounded-xl border border-green-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/products"
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
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

        {query.success ? (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {query.success}
          </div>
        ) : null}

        {query.error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {query.error}
          </div>
        ) : null}

        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600">
              Manajemen Produk
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Daftar produk
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Menampilkan {products.length} produk dari Supabase.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
          >
            + Produk Baru
          </Link>
        </div>

        {products.length === 0 ? (
          <section className="rounded-3xl border border-green-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              Belum ada produk.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Produk baru akan dibuat pada tahap berikutnya.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {products.map((product) => {
              const attributes = [...(product.product_attributes ?? [])]
                .sort((a, b) => a.display_order - b.display_order)
                .slice(0, 4);

              const archived =
                product.status === "archived" || Boolean(product.archived_at);

              const gameName = product.games?.[0]?.name ?? "-";

              return (
                <article
                  key={product.id}
                  className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${
                    archived ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-900">
                          {product.name}
                        </h2>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(
                            product.status,
                          )}`}
                        >
                          {product.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {gameName} · {product.product_code} ·{" "}
                        {product.product_type}
                      </p>

                      {attributes.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {attributes.map((attribute) => (
                            <span
                              key={`${product.id}-${attribute.attribute_key}`}
                              className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-600"
                            >
                              {attribute.attribute_key}:{" "}
                              {attribute.attribute_value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex-shrink-0 text-left sm:text-right">
                      <p className="font-bold text-green-700">
                        {formatRupiah(product.price_normal)}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        ID: {product.id.slice(0, 8)}
                      </p>

                      {!archived ? (
                        <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>

                          <form action={archiveProduct}>
                            <input
                              type="hidden"
                              name="product_id"
                              value={product.id}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Arsipkan
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
