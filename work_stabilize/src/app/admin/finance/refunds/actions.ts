"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

function errorUrl(message: string) {
  return `/admin/finance/refunds?error=${encodeURIComponent(message)}`;
}

export async function createRefundRequest(formData: FormData) {
  const { supabase } = await requireAdmin();

  const orderId = String(formData.get("order_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!orderId || !Number.isSafeInteger(amount) || amount <= 0 || !reason) {
    redirect(errorUrl("Order, nominal, dan alasan refund wajib diisi."));
  }

  const { error } = await supabase.rpc("admin_create_refund_request", {
    p_order_id: orderId,
    p_requested_amount: amount,
    p_reason: reason,
  });

  if (error) {
    const map: Record<string, string> = {
      only_paid_order_can_be_refunded:
        "Refund hanya dapat dibuat untuk order yang sudah dibayar.",
      refund_amount_exceeds_order_total:
        "Total refund melebihi jumlah pembayaran order.",
      refund_reason_required: "Alasan refund wajib diisi.",
    };

    const friendly =
      Object.entries(map).find(([code]) => error.message.includes(code))?.[1] ??
      error.message;

    redirect(errorUrl(friendly));
  }

  revalidatePath("/admin/finance/refunds");
  redirect(
    `/admin/finance/refunds?success=${encodeURIComponent(
      "Permintaan refund berhasil dibuat.",
    )}`,
  );
}

export async function reviewRefundRequest(formData: FormData) {
  const { supabase } = await requireAdmin();

  const refundId = String(formData.get("refund_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!refundId || !["approve", "reject", "cancel"].includes(decision)) {
    redirect(errorUrl("Tindakan refund tidak valid."));
  }

  const { error } = await supabase.rpc("admin_review_refund_request", {
    p_refund_id: refundId,
    p_decision: decision,
    p_admin_notes: notes || null,
  });

  if (error) {
    redirect(errorUrl(error.message));
  }

  revalidatePath("/admin/finance/refunds");
  redirect(
    `/admin/finance/refunds?success=${encodeURIComponent(
      "Status refund berhasil diperbarui.",
    )}`,
  );
}
