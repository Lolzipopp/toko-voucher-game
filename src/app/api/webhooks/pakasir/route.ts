import { NextResponse } from "next/server";

import {
  amountMatches,
  fetchPakasirTransactionDetail,
  getPakasirConfig,
  normalizePakasirStatus,
  type PakasirWebhookPayload,
} from "@/lib/payments/pakasir/client";
import { sendWebsiteTelegramMessage, telegramSafe } from "@/lib/notifications/telegram";
import { logServerError } from "@/lib/observability/server-log";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  delivery_status: string;
  reservation_expires_at: string | null;
};

type PaymentRow = {
  id: string;
  status: string;
  amount: number;
};

type PakasirDetail = {
  id?: string | number;
  transaction_id?: string | number;
  reference?: string | number;
  amount?: number | string;
  order_id?: string;
  project?: string;
  status?: string;
  payment_method?: string;
  completed_at?: string;
  [key: string]: unknown;
};

function safeEventId(payload: PakasirWebhookPayload) {
  const orderId = String(payload.order_id ?? "unknown");
  const amount = String(payload.amount ?? "unknown");
  const status = String(payload.status ?? "unknown");
  const completedAt = String(payload.completed_at ?? "no-time");
  return `${orderId}:${amount}:${status}:${completedAt}`.slice(0, 250);
}

function stableEventIdFromDetail(detail: PakasirDetail, fallback: string) {
  const stableId = detail.transaction_id ?? detail.id ?? detail.reference;
  if (stableId) return String(stableId).slice(0, 250);
  return fallback;
}

async function recordProviderEvent(input: {
  externalEventId: string;
  externalOrderId: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  processingStatus: "received" | "processed" | "ignored" | "failed";
  payload: PakasirWebhookPayload;
  errorMessage?: string | null;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("payment_provider_events").upsert(
    {
      provider: "pakasir",
      external_event_id: input.externalEventId,
      event_type: "payment_webhook",
      external_order_id: input.externalOrderId,
      order_id: input.orderId ?? null,
      payment_id: input.paymentId ?? null,
      verification_status: input.verificationStatus,
      processing_status: input.processingStatus,
      payload: input.payload,
      error_message: input.errorMessage ?? null,
      processed_at:
        input.processingStatus === "received" ? null : new Date().toISOString(),
    },
    { onConflict: "provider,external_event_id" },
  );
}

export async function POST(request: Request) {
  let payload: PakasirWebhookPayload;

  try {
    payload = (await request.json()) as PakasirWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }

  const config = getPakasirConfig();
  const externalEventId = safeEventId(payload);
  const externalOrderId = typeof payload.order_id === "string" ? payload.order_id : null;

  try {
    if (!config.enabled || !config.slug || !config.apiKey) {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        verificationStatus: "rejected",
        processingStatus: "ignored",
        payload,
        errorMessage: "pakasir_not_configured",
      });
      return NextResponse.json({ ok: false, message: "pakasir_not_configured" }, { status: 503 });
    }

    if (!externalOrderId || typeof payload.project !== "string") {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        verificationStatus: "rejected",
        processingStatus: "ignored",
        payload,
        errorMessage: "invalid_payload",
      });
      return NextResponse.json({ ok: false, message: "invalid_payload" }, { status: 400 });
    }

    if (payload.project !== config.slug) {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        verificationStatus: "rejected",
        processingStatus: "ignored",
        payload,
        errorMessage: "project_mismatch",
      });
      return NextResponse.json({ ok: false, message: "project_mismatch" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, payment_status, delivery_status, reservation_expires_at")
      .eq("order_number", externalOrderId)
      .single();

    if (orderError || !order) {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        verificationStatus: "rejected",
        processingStatus: "ignored",
        payload,
        errorMessage: "order_not_found",
      });
      return NextResponse.json({ ok: false, message: "order_not_found" }, { status: 404 });
    }

    const typedOrder = order as OrderRow;

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, status, amount")
      .eq("order_id", typedOrder.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        verificationStatus: "rejected",
        processingStatus: "failed",
        payload,
        errorMessage: "payment_not_found",
      });
      return NextResponse.json({ ok: false, message: "payment_not_found" }, { status: 404 });
    }

    const typedPayment = payment as PaymentRow;

    if (!amountMatches(payload.amount, typedOrder.total_amount)) {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "rejected",
        processingStatus: "ignored",
        payload,
        errorMessage: "amount_mismatch",
      });
      return NextResponse.json({ ok: false, message: "amount_mismatch" }, { status: 400 });
    }

    if (!amountMatches(typedPayment.amount, typedOrder.total_amount)) {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "rejected",
        processingStatus: "failed",
        payload,
        errorMessage: "local_payment_amount_mismatch",
      });
      return NextResponse.json({ ok: false, message: "local_payment_amount_mismatch" }, { status: 409 });
    }

    if (typedOrder.payment_status === "paid" && typedOrder.delivery_status === "delivered") {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "verified",
        processingStatus: "processed",
        payload,
      });
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const webhookStatus = normalizePakasirStatus(payload.status);
    if (webhookStatus !== "paid") {
      await recordProviderEvent({
        externalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "pending",
        processingStatus: "ignored",
        payload,
        errorMessage: `non_paid_status:${payload.status ?? "unknown"}`,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const isSandboxWebhook = payload.is_sandbox === true;
    let detail: PakasirDetail;

    try {
      if (isSandboxWebhook) {
        // Pakasir sandbox transaction detail can be unavailable/ephemeral.
        // Keep strict local checks above, but do not block sandbox callback testing.
        detail = {
          amount: payload.amount,
          order_id: payload.order_id,
          project: payload.project,
          status: payload.status,
          payment_method: payload.payment_method,
          completed_at: payload.completed_at,
          is_sandbox: true,
        };
      } else {
        detail = (await fetchPakasirTransactionDetail({
          orderNumber: typedOrder.order_number,
          amount: typedOrder.total_amount,
        })) as PakasirDetail;
      }
    } catch {
      // Production webhook payload from Pakasir is already the provider callback.
      // If transaction-detail API is delayed/unavailable, still process strictly
      // when project, order_id, amount, and completed status matched above.
      detail = {
        amount: payload.amount,
        order_id: payload.order_id,
        project: payload.project,
        status: payload.status,
        payment_method: payload.payment_method,
        completed_at: payload.completed_at,
        is_sandbox: payload.is_sandbox,
        detail_fallback: true,
      };
    }

    const verifiedExternalEventId = stableEventIdFromDetail(detail, externalEventId);

    if (
      detail.project !== config.slug ||
      detail.order_id !== typedOrder.order_number ||
      !amountMatches(detail.amount, typedOrder.total_amount) ||
      normalizePakasirStatus(detail.status) !== "paid"
    ) {
      await recordProviderEvent({
        externalEventId: verifiedExternalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "rejected",
        processingStatus: "ignored",
        payload,
        errorMessage: "transaction_detail_not_verified",
      });
      return NextResponse.json({ ok: false, message: "transaction_detail_not_verified" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const providerPayload = {
      pakasir_webhook: payload,
      pakasir_transaction_detail: detail,
      auto_verified_at: now,
    };

    const { data: updatedPayment, error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        provider: "pakasir",
        payment_method: String(detail.payment_method ?? payload.payment_method ?? "pakasir"),
        external_id: typedOrder.order_number,
        status: "paid",
        paid_at: detail.completed_at ?? payload.completed_at ?? now,
        webhook_received_at: now,
        webhook_idempotency_key: `PAKASIR-${verifiedExternalEventId}`,
        provider_payload: providerPayload,
        updated_at: now,
      })
      .eq("id", typedPayment.id)
      .in("status", ["pending", "processing"])
      .select("id")
      .maybeSingle();

    if (updatePaymentError) throw updatePaymentError;

    if (!updatedPayment) {
      await recordProviderEvent({
        externalEventId: verifiedExternalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "verified",
        processingStatus: "ignored",
        payload,
        errorMessage: "duplicate_or_already_processed_payment",
      });
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "processing",
        payment_status: "paid",
        delivery_status: "processing",
        paid_at: detail.completed_at ?? payload.completed_at ?? now,
        updated_at: now,
      })
      .eq("id", typedOrder.id)
      .in("payment_status", ["pending", "processing"])
      .select("id")
      .maybeSingle();

    if (updateOrderError) throw updateOrderError;

    if (!updatedOrder) {
      await recordProviderEvent({
        externalEventId: verifiedExternalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "verified",
        processingStatus: "ignored",
        payload,
        errorMessage: "duplicate_or_already_processed_order",
      });
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const { data: deliveredCount, error: fulfillError } = await supabase.rpc(
      "fulfill_order_delivery",
      { p_order_id: typedOrder.id },
    );

    if (fulfillError) {
      await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_status: "paid",
          delivery_status: "delivery_failed",
          updated_at: now,
        })
        .eq("id", typedOrder.id);

      await recordProviderEvent({
        externalEventId: verifiedExternalEventId,
        externalOrderId,
        orderId: typedOrder.id,
        paymentId: typedPayment.id,
        verificationStatus: "verified",
        processingStatus: "failed",
        payload,
        errorMessage: fulfillError.message,
      });

      await sendWebsiteTelegramMessage(
        [
          "⚠️ <b>Pembayaran Pakasir masuk, delivery gagal</b>",
          `Order: <b>${telegramSafe(typedOrder.order_number)}</b>`,
          `Total: Rp ${telegramSafe(Number(typedOrder.total_amount).toLocaleString("id-ID"))}`,
          "Status: paid, perlu kirim manual/cek stok.",
        ].join("\n"),
      );

      return NextResponse.json({
        ok: true,
        paid: true,
        deliveryFailed: true,
        message: "payment_verified_delivery_failed",
      });
    }

    await recordProviderEvent({
      externalEventId: verifiedExternalEventId,
      externalOrderId,
      orderId: typedOrder.id,
      paymentId: typedPayment.id,
      verificationStatus: "verified",
      processingStatus: "processed",
      payload,
    });

    await sendWebsiteTelegramMessage(
      [
        "✅ <b>Pembayaran Pakasir otomatis berhasil</b>",
        `Order: <b>${telegramSafe(typedOrder.order_number)}</b>`,
        `Total: Rp ${telegramSafe(Number(typedOrder.total_amount).toLocaleString("id-ID"))}`,
        `Akun terkirim: ${telegramSafe(Number(deliveredCount ?? 0))}`,
      ].join("\n"),
    );

    return NextResponse.json({ ok: true, deliveredCount: Number(deliveredCount ?? 0) });
  } catch (error) {
    logServerError("pakasir_webhook_failed", error, {
      externalOrderId,
      externalEventId,
    });

    await recordProviderEvent({
      externalEventId,
      externalOrderId,
      verificationStatus: "rejected",
      processingStatus: "failed",
      payload,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json({ ok: false, message: "webhook_failed" }, { status: 500 });
  }
}
