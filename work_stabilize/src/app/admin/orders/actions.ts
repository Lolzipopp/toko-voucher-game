"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type TestOrderActionResult = {
  ok: boolean;
  message: string;
  orderId?: string;
};

async function getActiveAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, error: "Sesi admin tidak ditemukan." };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) {
    return { supabase: null, error: "Akun bukan admin aktif." };
  }

  return { supabase, error: null };
}

export async function createTestOrder(input: {
  productId: string;
  quantity: number;
  customerEmail: string;
  reservationMinutes: number;
}): Promise<TestOrderActionResult> {
  if (!input.productId) {
    return { ok: false, message: "Produk wajib dipilih." };
  }

  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 50) {
    return { ok: false, message: "Jumlah harus antara 1–50." };
  }

  if (
    !Number.isSafeInteger(input.reservationMinutes) ||
    input.reservationMinutes < 1 ||
    input.reservationMinutes > 60
  ) {
    return { ok: false, message: "Durasi reservasi harus antara 1–60 menit." };
  }

  if (!input.customerEmail.trim() || !input.customerEmail.includes("@")) {
    return { ok: false, message: "Email tes tidak valid." };
  }

  const { supabase, error: authError } = await getActiveAdminClient();

  if (!supabase) {
    return { ok: false, message: authError ?? "Akses ditolak." };
  }

  const { data, error } = await supabase.rpc("admin_create_test_order", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_customer_email: input.customerEmail.trim().toLowerCase(),
    p_reservation_minutes: input.reservationMinutes,
  });

  if (error) {
    const message = error.message.includes("insufficient_stock")
      ? "Stok tidak cukup. Order dan reservasi parsial otomatis dibatalkan."
      : error.message;

    return { ok: false, message };
  }

  const result = data as
    | {
        order_id?: string;
        order_number?: string;
        reserved_count?: number;
      }
    | null;

  if (!result?.order_id) {
    return { ok: false, message: "Order tes dibuat tetapi ID order tidak diterima." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return {
    ok: true,
    orderId: result.order_id,
    message: `${result.order_number ?? "Order tes"} berhasil dibuat dan ${result.reserved_count ?? input.quantity} stok direservasi.`,
  };
}

export async function releaseExpiredTestOrders(): Promise<TestOrderActionResult> {
  const { supabase, error: authError } = await getActiveAdminClient();

  if (!supabase) {
    return { ok: false, message: authError ?? "Akses ditolak." };
  }

  const { data, error } = await supabase.rpc("admin_release_expired_test_orders");

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = data as
    | {
        expired_order_count?: number;
        released_stock_count?: number;
      }
    | null;

  const expiredOrders = result?.expired_order_count ?? 0;
  const releasedStock = result?.released_stock_count ?? 0;

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return {
    ok: true,
    message:
      expiredOrders === 0
        ? "Belum ada order tes kedaluwarsa yang perlu dilepas."
        : `${expiredOrders} order tes dibuat expired dan ${releasedStock} stok dikembalikan menjadi available.`,
  };
}


export async function simulateTestPaidDelivery(
  orderId: string,
): Promise<TestOrderActionResult> {
  if (!orderId) {
    return { ok: false, message: "ID order tidak valid." };
  }

  const { supabase, error: authError } = await getActiveAdminClient();

  if (!supabase) {
    return { ok: false, message: authError ?? "Akses ditolak." };
  }

  const { data, error } = await supabase.rpc(
    "admin_simulate_test_paid_delivery",
    {
      p_order_id: orderId,
    },
  );

  if (error) {
    const message = error.message.includes("reservation_expired")
      ? "Reservasi sudah kedaluwarsa. Lepaskan reservasi lalu buat order tes baru."
      : error.message;

    return { ok: false, message };
  }

  const result = data as
    | {
        ok?: boolean;
        already_processed?: boolean;
        delivered_count?: number;
        message?: string;
      }
    | null;

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/inventory");

  if (!result?.ok) {
    return {
      ok: false,
      message:
        result?.message ??
        "Pembayaran berhasil ditandai paid, tetapi delivery gagal.",
    };
  }

  const { error: promoError } = await supabase.rpc(
    "admin_finalize_test_order_promo",
    { p_order_id: orderId },
  );

  if (promoError) {
    return {
      ok: false,
      message: "Order terkirim, tetapi pencatatan promo gagal. Periksa audit log.",
    };
  }

  return {
    ok: true,
    orderId,
    message: result.already_processed
      ? `Order sudah pernah diproses. ${result.delivered_count ?? 0} stok tetap terhubung.`
      : `Pembayaran dummy paid dan ${result.delivered_count ?? 0} stok berhasil dikirim.`,
  };
}


export async function confirmManualPaymentAndDeliver(input: {
  orderId: string;
  paymentReference: string;
  adminNotes: string;
}): Promise<TestOrderActionResult> {
  if (!input.orderId) {
    return { ok: false, message: "ID order tidak valid." };
  }

  const { supabase, error: authError } =
    await getActiveAdminClient();

  if (!supabase) {
    return {
      ok: false,
      message: authError ?? "Akses ditolak.",
    };
  }

  const { data, error } = await supabase.rpc(
    "admin_confirm_manual_payment_and_deliver",
    {
      p_order_id: input.orderId,
      p_payment_reference:
        input.paymentReference.trim() || null,
      p_admin_notes: input.adminNotes.trim() || null,
    },
  );

  if (error) {
    const message = error.message.includes("reservation_expired")
      ? "Waktu pesanan sudah habis. Minta pembeli membuat order baru."
      : error.message.includes("order_not_payable")
        ? "Order ini sudah expired, gagal, atau refunded."
        : error.message;

    return { ok: false, message };
  }

  const result = data as {
    ok?: boolean;
    already_processed?: boolean;
    delivered_count?: number;
    message?: string;
  } | null;

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderId}`);
  revalidatePath("/admin/inventory");

  if (!result?.ok) {
    return {
      ok: false,
      message:
        result?.message ??
        "Pembayaran tercatat, tetapi pengiriman akun gagal.",
    };
  }

  return {
    ok: true,
    orderId: input.orderId,
    message: result.already_processed
      ? "Order sudah pernah dikonfirmasi dan dikirim."
      : `Pembayaran dikonfirmasi dan ${
          result.delivered_count ?? 0
        } akun berhasil dikirim.`,
  };
}
