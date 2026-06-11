import { notFound } from "next/navigation";

import StoreFooter from "@/components/store/store-footer";
import StoreHeader from "@/components/store/store-header";
import { createClient } from "@/lib/supabase/server";

import PaymentCountdown from "./payment-countdown";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{
    token: string;
  }>;
};

type CheckoutStatus = {
  ok: boolean;
  state:
    | "awaiting_payment"
    | "paid"
    | "delivered"
    | "expired"
    | "failed"
    | "error";
  order_number?: string;
  subtotal?: number;
  discount_amount?: number;
  total_amount?: number;
  promo_code?: string | null;
  order_status?: string;
  payment_status?: string;
  delivery_status?: string;
  payment_expires_at?: string | null;
  server_now?: string;
};

export default async function CheckoutSuccessPage({
  params,
}: Props) {
  const { token } = await params;

  if (!token || token.length < 32 || token.length > 256) {
    notFound();
  }

  const supabase = await createClient();
  const [
    { data, error },
    { data: publicSettings },
  ] = await Promise.all([
    supabase.rpc("get_public_checkout_status", {
      p_access_token: token,
    }),
    supabase.rpc("get_public_store_settings"),
  ]);

  if (error) {
    throw new Error("Gagal membuka status pesanan.");
  }

  const status = data as CheckoutStatus | null;

  if (!status?.ok) {
    notFound();
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const statusUrl = `${siteUrl}/checkout/success/${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <PaymentCountdown
          token={token}
          initialStatus={status}
          statusUrl={statusUrl}
          manualSales={{
            enabled:
              (publicSettings as {
                manual_sales_enabled?: boolean;
              } | null)?.manual_sales_enabled ?? true,
            whatsappNumber:
              (publicSettings as {
                whatsapp_number?: string | null;
              } | null)?.whatsapp_number ?? null,
            storeName:
              (publicSettings as {
                store_name?: string | null;
              } | null)?.store_name ?? "RIKU STORE",
            instructions:
              (publicSettings as {
                manual_payment_instructions?: string | null;
              } | null)?.manual_payment_instructions ??
              "Pembayaran otomatis belum tersedia. Hubungi admin melalui WhatsApp untuk menerima instruksi pembayaran.",
          }}
        />
      </div>
          <StoreFooter />
</main>
  );
}
