"use server";

import { createClient } from "@/lib/supabase/server";

export type PromoResult =
  | {
      ok: true;
      code: string;
      description: string | null;
      subtotal: number;
      discountAmount: number;
      totalAmount: number;
    }
  | { ok: false; message: string };

export type CheckoutResult =
  | {
      ok: true;
      orderNumber: string;
      accessToken: string;
      subtotal: number;
      discountAmount: number;
      totalAmount: number;
      promoCode: string | null;
      reservationExpiresAt: string;
    }
  | { ok: false; message: string };

type CheckoutInput = {
  email: string;
  promoCode?: string;
  items: Array<{ productId: string; quantity: number }>;
};

function safeItems(items: CheckoutInput["items"]) {
  return items.map((item) => ({
    product_id: item.productId,
    quantity: Math.floor(item.quantity),
  }));
}

function validateInput(input: CheckoutInput): string | null {
  if (!input.email.trim() || input.email.trim().length > 254) {
    return "Email pembeli tidak valid.";
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    return "Keranjang tidak valid.";
  }
  if (safeItems(input.items).some((item) => !item.product_id || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    return "Jumlah produk tidak valid.";
  }
  return null;
}

export async function validatePromo(input: CheckoutInput): Promise<PromoResult> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, message: invalid };
  if (!input.promoCode?.trim()) return { ok: false, message: "Masukkan kode promo." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_public_promo", {
    p_customer_email: input.email.trim().toLowerCase(),
    p_items: safeItems(input.items),
    p_promo_code: input.promoCode.trim().toUpperCase(),
  });

  if (error) return { ok: false, message: "Promo belum dapat diperiksa. Coba lagi." };
  const result = data as { ok?: boolean; message?: string; code?: string; description?: string | null; subtotal?: number; discount_amount?: number; total_amount?: number } | null;
  if (!result?.ok || !result.code) return { ok: false, message: result?.message ?? "Kode promo tidak valid." };

  return {
    ok: true,
    code: result.code,
    description: result.description ?? null,
    subtotal: Number(result.subtotal ?? 0),
    discountAmount: Number(result.discount_amount ?? 0),
    totalAmount: Number(result.total_amount ?? 0),
  };
}

export async function createCheckoutOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, message: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_public_checkout_order_v2", {
    p_customer_email: input.email.trim().toLowerCase(),
    p_items: safeItems(input.items),
    p_promo_code: input.promoCode?.trim().toUpperCase() || null,
    p_payment_minutes: 20,
  });

  if (error) {
    const raw = error.message;
    const message = raw.includes("insufficient_stock")
      ? "Stok tidak mencukupi. Perbarui keranjang dan coba lagi."
      : raw.includes("promo_minimum_not_met")
        ? "Minimum belanja untuk promo belum terpenuhi."
        : raw.includes("promo_not_applicable")
          ? "Promo tidak berlaku untuk produk ini."
          : raw.includes("promo_customer_limit")
            ? "Email ini sudah mencapai batas penggunaan promo."
            : raw.includes("promo_usage_limit")
              ? "Kuota kode promo sudah habis."
              : raw.includes("promo_expired") || raw.includes("promo_invalid")
                ? "Kode promo tidak valid atau sudah berakhir."
                : raw.includes("product_unavailable")
                  ? "Salah satu produk sudah tidak tersedia."
                  : "Checkout gagal dibuat. Silakan coba lagi.";
    return { ok: false, message };
  }

  const result = data as { ok?: boolean; order_number?: string; access_token?: string; subtotal?: number; discount_amount?: number; total_amount?: number; promo_code?: string | null; reservation_expires_at?: string } | null;
  if (!result?.ok || !result.order_number || !result.access_token || !result.reservation_expires_at) {
    return { ok: false, message: "Respons checkout tidak lengkap." };
  }

  return {
    ok: true,
    orderNumber: result.order_number,
    accessToken: result.access_token,
    subtotal: Number(result.subtotal ?? 0),
    discountAmount: Number(result.discount_amount ?? 0),
    totalAmount: Number(result.total_amount ?? 0),
    promoCode: result.promo_code ?? null,
    reservationExpiresAt: result.reservation_expires_at,
  };
}
