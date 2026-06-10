import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import PaidDeliveryPanel from "./paid-delivery-panel";
import EmailDeliveryPanel from "./email-delivery-panel";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_purchase_cost: number | null;
  line_total: number;
  product_name_snapshot: string;
  product_attributes_snapshot: Record<string, unknown> | null;
  order_item_inventory:
    | {
        id: string;
        inventory_account_id: string;
        purchase_cost_snapshot: number;
        delivered_at: string | null;
        inventory_accounts: { status: string; supplier: string | null }[] | null;
      }[]
    | null;
};

type Payment = {
  id: string;
  provider: string;
  payment_method: string | null;
  external_id: string | null;
  amount: number;
  fee: number;
  status: string;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
};

type EmailDeliveryLog = {
  id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
};

type Reservation = {
  id: string;
  inventory_account_id: string;
  reserved_until: string;
  released_at: string | null;
  release_reason: string | null;
  created_at: string;
};

type OrderDetail = {
  id: string;
  order_number: string;
  customer_email: string;
  subtotal: number;
  discount_amount: number;
  payment_fee: number;
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
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[] | null;
  payments: Payment[] | null;
  stock_reservations: Reservation[] | null;
  order_email_deliveries: EmailDeliveryLog[] | null;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    paid: "bg-emerald-100 text-emerald-800",
    delivered: "bg-emerald-100 text-emerald-800",
    delivery_failed: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
    expired: "bg-slate-200 text-slate-600",
    refunded: "bg-purple-100 text-purple-800",
    available: "bg-emerald-100 text-emerald-800",
    reserved: "bg-amber-100 text-amber-800",
    sold: "bg-slate-200 text-slate-700",
  };

  return map[status] ?? "bg-slate-100 text-slate-600";
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) redirect("/admin/login");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customer_email,
      subtotal,
      discount_amount,
      payment_fee,
      total_amount,
      status,
      payment_status,
      delivery_status,
      reservation_expires_at,
      paid_at,
      delivered_at,
      warranty_ends_at,
      credentials_hidden_at,
      access_token,
      internal_notes,
      created_at,
      updated_at,
      order_items(
        id,
        product_id,
        quantity,
        unit_price,
        unit_purchase_cost,
        line_total,
        product_name_snapshot,
        product_attributes_snapshot,
        order_item_inventory(
          id,
          inventory_account_id,
          purchase_cost_snapshot,
          delivered_at,
          inventory_accounts(status, supplier)
        )
      ),
      payments(
        id,
        provider,
        payment_method,
        external_id,
        amount,
        fee,
        status,
        paid_at,
        expired_at,
        created_at
      ),
      order_email_deliveries(id, status, sent_at, created_at),
      stock_reservations(
        id,
        inventory_account_id,
        reserved_until,
        released_at,
        release_reason,
        created_at
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const order = data as OrderDetail;
  const itemCount = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const activeReservations = (order.stock_reservations ?? []).filter((row) => !row.released_at);
  const lastSentEmail = (order.order_email_deliveries ?? []).filter((row) => row.status === "sent").sort((a, b) => new Date(b.sent_at ?? b.created_at).getTime() - new Date(a.sent_at ?? a.created_at).getTime())[0] ?? null;

  return (
    <AdminShell active="orders" admin={admin}>
      <PageTitle
        eyebrow="Order Detail"
        title={order.order_number}
        description={`${order.customer_email} · ${itemCount} unit · dibuat ${formatDate(order.created_at)}`}
        action={
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            ← Kembali
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Status order", order.status],
          ["Pembayaran", order.payment_status],
          ["Pengiriman", order.delivery_status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${badge(value)}`}>
              {value}
            </span>
          </div>
        ))}
      </section>

      <PaidDeliveryPanel
        orderId={order.id}
        isTestOrder={
          order.internal_notes ===
          "INTERNAL TEST ORDER — not a real customer transaction"
        }
        paymentStatus={order.payment_status}
        deliveryStatus={order.delivery_status}
      />

      <EmailDeliveryPanel
        orderId={order.id}
        recipient={order.customer_email}
        enabled={order.payment_status === "paid" && order.delivery_status === "delivered"}
        lastSentAt={lastSentEmail?.sent_at ?? null}
      />

      {order.payment_status === "paid" &&
      order.delivery_status === "delivered" ? (
        <section className="mt-5 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Customer Delivery Page
              </p>
              <h2 className="mt-2 text-lg font-black text-slate-950">
                Halaman aman untuk pembeli
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Kredensial hanya terlihat sampai {formatDate(
                  order.credentials_hidden_at,
                )}. Jangan membagikan link ini selain kepada pembeli.
              </p>
            </div>

            <Link
              href={`/order/${order.access_token}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Buka halaman pembeli ↗
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">Item pesanan</h2>
            <div className="mt-4 space-y-3">
              {(order.order_items ?? []).map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-black text-slate-900">{item.product_name_snapshot}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantity} × {formatRupiah(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-black text-emerald-700">{formatRupiah(item.line_total)}</p>
                  </div>

                  {(item.order_item_inventory ?? []).length > 0 ? (
                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stok terhubung</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(item.order_item_inventory ?? []).map((linked) => {
                          const inventory = linked.inventory_accounts?.[0];
                          return (
                            <span key={linked.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600">
                              {linked.inventory_account_id.slice(0, 8)} · {inventory?.status ?? "-"} · {inventory?.supplier ?? "tanpa supplier"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-slate-950">Pembayaran</h2>
            {(order.payments ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Belum ada record pembayaran.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {(order.payments ?? []).map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900">{payment.provider}</p>
                        <p className="mt-1 text-xs text-slate-500">{payment.payment_method ?? "Metode belum dipilih"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${badge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <p>Nominal<br/><b className="text-slate-800">{formatRupiah(payment.amount)}</b></p>
                      <p>Biaya<br/><b className="text-slate-800">{formatRupiah(payment.fee)}</b></p>
                      <p>Dibuat<br/><b className="text-slate-800">{formatDate(payment.created_at)}</b></p>
                      <p>Dibayar<br/><b className="text-slate-800">{formatDate(payment.paid_at)}</b></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl bg-[#103d2b] p-5 text-white shadow-xl shadow-emerald-950/10 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Ringkasan pembayaran</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-white/65"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
              <div className="flex justify-between text-white/65"><span>Diskon</span><span>-{formatRupiah(order.discount_amount)}</span></div>
              <div className="flex justify-between text-white/65"><span>Biaya pembayaran</span><span>{formatRupiah(order.payment_fee)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-black"><span>Total</span><span>{formatRupiah(order.total_amount)}</span></div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Waktu penting</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div><dt className="text-slate-400">Reservasi berakhir</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(order.reservation_expires_at)}</dd></div>
              <div><dt className="text-slate-400">Dibayar</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(order.paid_at)}</dd></div>
              <div><dt className="text-slate-400">Dikirim</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(order.delivered_at)}</dd></div>
              <div><dt className="text-slate-400">Garansi berakhir</dt><dd className="mt-1 font-bold text-slate-700">{formatDate(order.warranty_ends_at)}</dd></div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Reservasi stok</h2>
            <p className="mt-2 text-sm text-slate-500">{activeReservations.length} reservasi aktif dari {(order.stock_reservations ?? []).length} record.</p>
            {(order.stock_reservations ?? []).length > 0 ? (
              <div className="mt-4 space-y-2">
                {(order.stock_reservations ?? []).map((reservation) => (
                  <div key={reservation.id} className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-bold">Stok {reservation.inventory_account_id.slice(0, 8)}</p>
                    <p className="mt-1">Sampai {formatDate(reservation.reserved_until)}</p>
                    {reservation.released_at ? <p className="mt-1 text-slate-400">Dilepas: {reservation.release_reason ?? "-"}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {order.internal_notes ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Catatan internal</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">{order.internal_notes}</p>
            </div>
          ) : null}
        </aside>
      </section>
    </AdminShell>
  );
}
