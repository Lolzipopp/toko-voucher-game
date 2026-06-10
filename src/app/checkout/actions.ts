"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { checkoutErrorMessage } from "@/lib/checkout/errors";
import { STORE_CONFIG } from "@/lib/config/store";
import { createClient } from "@/lib/supabase/server";

export type PromoResult =
  | { ok: true; code: string; description: string | null; subtotal: number; discountAmount: number; totalAmount: number }
  | { ok: false; message: string };

export type CheckoutResult =
  | { ok: true; orderNumber: string; accessToken: string; subtotal: number; discountAmount: number; totalAmount: number; promoCode: string | null; paymentExpiresAt: string }
  | { ok: false; message: string };

type CheckoutInput = { email: string; promoCode?: string; items: Array<{ productId: string; quantity: number }> };

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

export async function createCheckoutOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, message: invalid };

  const email = input.email.trim().toLowerCase();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_public_checkout_order_v3", {
    p_customer_email: email,
    p_items: normalizedItems(input.items),
    p_promo_code: input.promoCode?.trim().toUpperCase() || null,
    p_request_key: await requestKey(email),
  });

  if (error) return { ok: false, message: checkoutErrorMessage(error.message) };

  const result = data as { ok?: boolean; order_number?: string; access_token?: string; subtotal?: number; discount_amount?: number; total_amount?: number; promo_code?: string | null; payment_expires_at?: string } | null;
  if (!result?.ok || !result.order_number || !result.access_token || !result.payment_expires_at) return { ok: false, message: "Respons checkout tidak lengkap." };

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
