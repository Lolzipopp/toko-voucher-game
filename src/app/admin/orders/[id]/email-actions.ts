"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/require-admin";
import { logServerError } from "@/lib/observability/server-log";

export type EmailActionResult = { ok: boolean; message: string };
function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[char] ?? char,
  );
}

export async function sendOrderDeliveryEmail(
  orderId: string,
): Promise<EmailActionResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"
  ).replace(/\/$/, "");
  if (!apiKey || !from)
    return {
      ok: false,
      message:
        "Email belum dikonfigurasi. Isi RESEND_API_KEY dan RESEND_FROM_EMAIL di .env.local.",
    };

  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, message: auth.message };
  const { supabase, user } = auth;

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_email, access_token, payment_status, delivery_status, warranty_ends_at, credentials_hidden_at, order_items(product_name_snapshot, quantity)`,
    )
    .eq("id", orderId)
    .single();
  if (error || !order) {
    logServerError("admin_order_email_load_failed", error, { orderId });
    return {
      ok: false,
      message: "Order tidak ditemukan atau belum dapat dimuat.",
    };
  }
  if (order.payment_status !== "paid" || order.delivery_status !== "delivered")
    return {
      ok: false,
      message: "Email hanya dapat dikirim untuk order paid dan delivered.",
    };

  const deliveryUrl = `${siteUrl}/order/${order.access_token}`;
  const items = (order.order_items ?? [])
    .map(
      (item) =>
        `<li style="margin:6px 0">${escapeHtml(item.product_name_snapshot)} × ${item.quantity}</li>`,
    )
    .join("");
  const warranty = order.warranty_ends_at
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(order.warranty_ends_at))
    : "-";
  const hiddenAt = order.credentials_hidden_at
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(order.credentials_hidden_at))
    : "-";
  const html = `<!doctype html><html><body style="margin:0;background:#f4faf6;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#103d2b;color:white;padding:28px;border-radius:24px 24px 0 0"><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#a7f3d0">RIKU STORE</div><h1 style="margin:10px 0 0;font-size:26px">Pesananmu sudah siap 🎮</h1></div><div style="background:white;padding:28px;border:1px solid #d1fae5;border-top:0;border-radius:0 0 24px 24px"><p style="margin-top:0;line-height:1.7">Pembayaran order <strong>${escapeHtml(order.order_number)}</strong> sudah terverifikasi dan akunmu siap dilihat.</p><ul style="padding-left:20px">${items}</ul><a href="${deliveryUrl}" style="display:block;margin:24px 0;background:#059669;color:white;text-decoration:none;text-align:center;padding:15px 20px;border-radius:14px;font-weight:800">Lihat Akun Saya</a><div style="background:#f1f5f9;padding:16px;border-radius:14px;font-size:13px;line-height:1.7"><strong>Garansi sampai:</strong> ${escapeHtml(warranty)}<br><strong>Data akun terlihat sampai:</strong> ${escapeHtml(hiddenAt)}</div><p style="font-size:12px;color:#64748b;line-height:1.7;margin-bottom:0">Jangan bagikan email atau link ini. Password tidak ditulis di email demi keamanan.</p></div></div></body></html>`;

  let providerId: string | null = null;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [order.customer_email],
        subject: `Pesanan ${order.order_number} sudah siap`,
        html,
      }),
    });
    const payload = (await response.json()) as {
      id?: string;
      message?: string;
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(
        payload.message ??
          payload.error?.message ??
          "Provider email menolak permintaan.",
      );
    providerId = payload.id ?? null;
    await supabase
      .from("order_email_deliveries")
      .insert({
        order_id: order.id,
        recipient_email: order.customer_email,
        provider: "resend",
        provider_message_id: providerId,
        status: "sent",
        sent_by: user.id,
        sent_at: new Date().toISOString(),
      });
  } catch (sendError) {
    const providerMessage =
      sendError instanceof Error ? sendError.message : "Email gagal dikirim.";
    logServerError("order_delivery_email_failed", sendError, {
      orderId,
      provider: "resend",
    });
    await supabase
      .from("order_email_deliveries")
      .insert({
        order_id: order.id,
        recipient_email: order.customer_email,
        provider: "resend",
        status: "failed",
        error_message: providerMessage.slice(0, 500),
        sent_by: user.id,
      });
    revalidatePath(`/admin/orders/${orderId}`);
    return {
      ok: false,
      message:
        "Email belum berhasil dikirim. Coba lagi atau arahkan pembeli membuka dashboard akun.",
    };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return {
    ok: true,
    message: providerId
      ? `Email berhasil dikirim (${providerId}).`
      : "Email berhasil dikirim.",
  };
}
