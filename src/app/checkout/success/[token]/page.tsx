import { notFound } from "next/navigation";

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
  const { data, error } = await supabase.rpc(
    "get_public_checkout_status",
    {
      p_access_token: token,
    },
  );

  if (error) {
    throw new Error("Gagal membuka status pesanan.");
  }

  const status = data as CheckoutStatus | null;

  if (!status?.ok) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7fbf8] text-slate-950">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <PaymentCountdown
          token={token}
          initialStatus={status}
        />
      </div>
    </main>
  );
}
