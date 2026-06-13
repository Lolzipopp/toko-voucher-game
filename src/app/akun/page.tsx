import Link from "next/link";
import { redirect } from "next/navigation";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { createClient } from "@/lib/supabase/server";

import { logoutCustomer } from "./actions";

import { formatRupiah } from "@/lib/format/display";
type CustomerOrder = {
  id: string;
  order_number: string;
  customer_email: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_status: string;
  reservation_expires_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  warranty_ends_at: string | null;
  credentials_hidden_at: string | null;
  access_token: string;
  created_at: string;
  item_count: number;
};


function date(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function customerStatus(order: CustomerOrder) {
  if (
    order.payment_status === "paid" &&
    order.delivery_status === "delivered"
  ) {
    return {
      label: "Akun siap dilihat",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  if (order.payment_status === "paid") {
    return {
      label: "Sedang diproses",
      className: "bg-blue-100 text-blue-800",
    };
  }

  if (
    order.status === "expired" ||
    order.payment_status === "expired"
  ) {
    return {
      label: "Kedaluwarsa",
      className: "bg-slate-200 text-slate-600",
    };
  }

  if (order.payment_status === "failed") {
    return {
      label: "Pembayaran gagal",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "Menunggu pembayaran",
    className: "bg-amber-100 text-amber-800",
  };
}

export default async function CustomerAccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/akun/login?next=/akun");
  }

  const { data, error } = await supabase.rpc(
    "get_customer_account_orders",
  );

  if (error) {
    throw new Error(`Gagal mengambil pesanan akun: ${error.message}`);
  }

  const orders = (data ?? []) as CustomerOrder[];
  const deliveredCount = orders.filter(
    (order) =>
      order.payment_status === "paid" &&
      order.delivery_status === "delivered",
  ).length;
  const activeCount = orders.filter(
    (order) =>
      ["pending", "processing"].includes(order.payment_status) &&
      order.status !== "expired",
  ).length;

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-[2rem] bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/15 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                Akun Pembeli
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Pesanan saya
              </h1>
              <p className="mt-2 text-sm text-white/65">{user.email}</p>
            </div>

            <form action={logoutCustomer}>
              <button className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white/80 transition hover:bg-white/10">
                Keluar
              </button>
            </form>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["Semua pesanan", String(orders.length)],
              ["Menunggu", String(activeCount)],
              ["Akun siap", String(deliveredCount)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-white/45">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {orders.map((order) => {
            const status = customerStatus(order);
            const delivered =
              order.payment_status === "paid" &&
              order.delivery_status === "delivered";

            return (
              <article
                key={order.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-slate-950">
                        {order.order_number}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {order.item_count} item · Dibuat {date(order.created_at)}
                    </p>

                    {order.discount_amount > 0 ? (
                      <p className="mt-2 text-xs font-semibold text-emerald-700">
                        Hemat {formatRupiah(order.discount_amount)}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 md:text-right">
                    <p className="text-xl font-black text-emerald-700">
                      {formatRupiah(order.total_amount)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                      <Link
                        href={`/checkout/success/${order.access_token}`}
                        className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                      >
                        Lihat status
                      </Link>

                      {delivered ? (
                        <Link
                          href={`/order/${order.access_token}`}
                          className="rounded-xl bg-[#103d2b] px-3.5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
                        >
                          Lihat akun
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Pembayaran
                    </dt>
                    <dd className="mt-1 font-bold capitalize">
                      {order.payment_status}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Pengiriman
                    </dt>
                    <dd className="mt-1 font-bold capitalize">
                      {order.delivery_status}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Garansi sampai
                    </dt>
                    <dd className="mt-1 font-bold">
                      {date(order.warranty_ends_at)}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}

          {orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="text-4xl">🛒</div>
              <h2 className="mt-4 text-xl font-black">
                Belum ada pesanan
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Pesanan dengan email ini akan otomatis muncul di sini.
              </p>
              <Link
                href="/#produk"
                className="mt-5 inline-flex rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white"
              >
                Lihat produk
              </Link>
            </div>
          ) : null}
        </section>
      </div>
          <StoreFooter />
</main>
  );
}
