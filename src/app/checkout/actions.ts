"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { checkoutErrorMessage } from "@/lib/checkout/errors";
import { STORE_CONFIG } from "@/lib/config/store";
import { sendWebsiteTelegramMessage, telegramSafe } from "@/lib/notifications/telegram";
import { createClient } from "@/lib/supabase/server";

export type PromoResult =
  | { ok: true; code: string; description: string | null; subtotal: number; discountAmount: number; totalAmount: number }
  | { ok: false; message: string };

export type CheckoutResult =
  | { ok: true; orderNumber: string; accessToken: string; subtotal: number; discountAmount: number; totalAmount: number; promoCode: string | null; paymentExpiresAt: string }
  | { ok: false; message: string };

export type PendingCheckoutResult =
  | { ok: true; hasPending: false }
  | { ok: true; hasPending: true; orderNumber: string; totalAmount: number; paymentExpiresAt: string }
  | { ok: false; message: string };

type CheckoutInput = { email: string; promoCode?: string; items: Array<{ productId: string; quantity: number }>; replacePending?: boolean };

function normalizedItems(items: CheckoutInput["items"]) {
  return items.map((item) => ({ product_id: item.productId, quantity: Math.floor(item.quantity) }));
}

function validateInput(input: CheckoutInput) {
  if (!input.email.trim() || input.email.trim().length > 254) return "Email pembeli tidak valid.";
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > STORE_CONFIG.maxCartLines) return "Keranjang tidak valid.";
  const invalid = normalizedItems(input.items).some((item) => !item.product_id || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > STORE_CONFIG.maxQuantityPerLine);
  return invalid ? "Jumlah produk tidak valid." : null;
}

async function requestKey(email: string) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const raw = `${forwarded || realIp || "unknown"}|${email.toLowerCase()}|${process.env.CHECKOUT_RATE_LIMIT_SECRET || "local-dev"}`;
  return createHash("sha256").update(raw).digest("hex");
}

export async function validatePromo(input: CheckoutInput): Promise<PromoResult> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, message: invalid };
  if (!input.promoCode?.trim()) return { ok: false, message: "Masukkan kode promo." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_public_promo", {
    p_customer_email: input.email.trim().toLowerCase(),
    p_items: normalizedItems(input.items),
    p_promo_code: input.promoCode.trim().toUpperCase(),
  });

  if (error) return { ok: false, message: "Promo belum dapat diperiksa. Coba lagi." };
  const result = data as { ok?: boolean; message?: string; code?: string; description?: string | null; subtotal?: number; discount_amount?: number; total_amount?: number } | null;
  if (!result?.ok || !result.code) return { ok: false, message: result?.message ?? "Kode promo tidak valid." };

  return { ok: true, code: result.code, description: result.description ?? null, subtotal: Number(result.subtotal ?? 0), discountAmount: Number(result.discount_amount ?? 0), totalAmount: Number(result.total_amount ?? 0) };
}

export async function getPendingCheckout(input: Pick<CheckoutInput, "email">): Promise<PendingCheckoutResult> {
  if (!input.email.trim() || input.email.trim().length > 254) {
    return { ok: false, message: "Email pembeli tidak valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_pending_checkout_by_email", {
    p_customer_email: input.email.trim().toLowerCase(),
  });

  if (error) return { ok: false, message: "Pesanan lama belum bisa dicek. Coba lagi." };

  const result = data as {
    ok?: boolean;
    has_pending?: boolean;
    order_number?: string;
    total_amount?: number;
    payment_expires_at?: string;
  } | null;

  if (!result?.ok || !result.has_pending) return { ok: true, hasPending: false };

  if (!result.order_number || !result.payment_expires_at) {
    return { ok: false, message: "Data pesanan lama tidak lengkap." };
  }

  return {
    ok: true,
    hasPending: true,
    orderNumber: result.order_number,
    totalAmount: Number(result.total_amount ?? 0),
    paymentExpiresAt: result.payment_expires_at,
  };
}

export async function createCheckoutOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, message: invalid };

  const email = input.email.trim().toLowerCase();
  const supabase = await createClient();

  if (input.replacePending) {
    const { error: cancelError } = await supabase.rpc("cancel_public_pending_checkout_by_email", {
      p_customer_email: email,
    });
    if (cancelError) {
      return { ok: false, message: "Pesanan lama belum bisa dibatalkan. Coba lagi." };
    }
  }

  const { data, error } = await supabase.rpc("create_public_checkout_order_v3", {
    p_customer_email: email,
    p_items: normalizedItems(input.items),
    p_promo_code: input.promoCode?.trim().toUpperCase() || null,
    p_request_key: await requestKey(email),
  });

  if (error) return { ok: false, message: checkoutErrorMessage(error.message) };

  const result = data as { ok?: boolean; order_number?: string; access_token?: string; subtotal?: number; discount_amount?: number; total_amount?: number; promo_code?: string | null; payment_expires_at?: string } | null;
  if (!result?.ok || !result.order_number || !result.access_token || !result.payment_expires_at) return { ok: false, message: "Respons checkout tidak lengkap." };

  await sendWebsiteTelegramMessage(
    [
      "🛒 <b>Order website baru</b>",
      `Order: <b>${telegramSafe(result.order_number)}</b>`,
      `Email: ${telegramSafe(email)}`,
      `Item: ${telegramSafe(input.items.length)} jenis`,
      `Total: Rp ${telegramSafe(Number(result.total_amount ?? 0).toLocaleString("id-ID"))}`,
      `Expired: ${telegramSafe(new Date(result.payment_expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))}`,
      "Status: menunggu pembayaran QRIS."
    ].join("\n"),
  );

  return {
    ok: true,
    orderNumber: result.order_number,
    accessToken: result.access_token,
    subtotal: Number(result.subtotal ?? 0),
    discountAmount: Number(result.discount_amount ?? 0),
    totalAmount: Number(result.total_amount ?? 0),
    promoCode: result.promo_code ?? null,
    paymentExpiresAt: result.payment_expires_at,
  };
}
