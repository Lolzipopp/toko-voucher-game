import StoreFooter from "@/components/store/store-footer";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { formatRupiah } from "@/lib/format/display";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type Credential = {
  inventory_id: string;
  username: string;
  password: string;
  delivered_at: string | null;
};

type DeliveryItem = {
  order_item_id: string;
  product_name: string;
  product_attributes: Record<string, unknown> | null;
  unit_price: number;
  credentials: Credential[];
};

type DeliveryPayload = {
  ok: boolean;
  state: "available" | "not_found" | "not_ready" | "hidden";
  order_number?: string;
  customer_email?: string;
  total_amount?: number;
  payment_status?: string;
  delivery_status?: string;
  paid_at?: string | null;
  delivered_at?: string | null;
  credentials_hidden_at?: string | null;
  warranty_ends_at?: string | null;
  items?: DeliveryItem[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function maskEmail(email?: string) {
  if (!email) return "-";

  const [name, domain] = email.split("@");

  if (!domain) return email;

  const visible = name.slice(0, Math.min(3, name.length));

  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

export default async function CustomerOrderPage({
  params,
}: OrderPageProps) {
  const { token } = await params;

  if (!token || token.length < 32 || token.length > 256) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_order_delivery_by_token",
    {
      p_access_token: token,
    },
  );

  if (error) {
    throw new Error("Gagal membuka detail pesanan.");
  }

  const delivery = data as DeliveryPayload | null;

  if (!delivery || delivery.state === "not_found") {
    notFound();
  }

  const available = delivery.ok && delivery.state === "available";

  return (
    <main className="min-h-screen bg-[#f4faf6] px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              RIKU STORE
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              Detail pesanan
            </h1>
          </div>

          <div className="rounded-2xl bg-[#103d2b] px-4 py-3 text-right text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              Nomor Order
            </p>
            <p className="mt-1 text-sm font-black">
              {delivery.order_number ?? "-"}
            </p>
          </div>
        </header>

        {!available ? (
          <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              {delivery.state === "hidden" ? "🔒" : "⏳"}
            </div>

            <h2 className="mt-5 text-xl font-black">
              {delivery.state === "hidden"
                ? "Data akun sudah disembunyikan"
                : "Pesanan belum siap dikirim"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {delivery.state === "hidden"
                ? "Masa tampil kredensial selama tujuh hari telah berakhir. Hubungi admin RIKU STORE melalui WhatsApp apabila memerlukan bantuan."
                : `Status pembayaran: ${delivery.payment_status ?? "-"} · status pengiriman: ${delivery.delivery_status ?? "-"}.`}
            </p>

            <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">Dikirim</dt>
                <dd className="mt-1 font-bold">
                  {formatDate(delivery.delivered_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">
                  Data disembunyikan
                </dt>
                <dd className="mt-1 font-bold">
                  {formatDate(delivery.credentials_hidden_at)}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Email
                </p>
                <p className="mt-2 break-all text-sm font-black">
                  {maskEmail(delivery.customer_email)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total
                </p>
                <p className="mt-2 text-sm font-black text-emerald-700">
                  {formatRupiah(delivery.total_amount)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Garansi sampai
                </p>
                <p className="mt-2 text-sm font-black">
                  {formatDate(delivery.warranty_ends_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Data terlihat sampai
                </p>
                <p className="mt-2 text-sm font-black">
                  {formatDate(delivery.credentials_hidden_at)}
                </p>
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
              <p className="text-sm font-black text-emerald-900">
                Simpan data akun sekarang
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Simpan data akun ini di tempat yang aman. Demi keamanan,
                informasi login hanya tersedia selama 7 hari setelah pengiriman.
              </p>
            </section>

            <section className="mt-5 space-y-4">
              {(delivery.items ?? []).map((item) => (
                <article
                  key={item.order_item_id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        Produk
                      </p>
                      <h2 className="mt-1 text-lg font-black">
                        {item.product_name}
                      </h2>
                    </div>

                    <p className="font-black text-emerald-700">
                      {formatRupiah(item.unit_price)}
                    </p>
                  </div>

                  {item.product_attributes &&
                  Object.keys(item.product_attributes).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(item.product_attributes).map(
                        ([key, value]) => (
                          <span
                            key={key}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600"
                          >
                            {key}: {String(value)}
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-3">
                    {item.credentials.map((credential, index) => (
                      <div
                        key={credential.inventory_id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-black text-slate-500">
                          Akun {index + 1}
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Username
                            </p>
                            <code className="mt-2 block break-all text-sm font-black text-slate-900">
                              {credential.username}
                            </code>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Password
                            </p>
                            <code className="mt-2 block break-all text-sm font-black text-slate-900">
                              {credential.password}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-5 rounded-3xl bg-[#103d2b] p-6 text-white shadow-xl shadow-emerald-950/10">
              <h2 className="text-lg font-black">Garansi tiga hari</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Rekam video sejak pertama kali membuka dan login memakai data
                akun ini. Garansi tidak mencakup cheat, berbagi password,
                pelanggaran Roblox, atau masalah akibat tindakan pembeli.
              </p>
            </section>
          </>
        )}

        <footer className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            Kembali ke RIKU STORE
          </Link>
        </footer>
      </div>
          <StoreFooter />
</main>
  );
}
