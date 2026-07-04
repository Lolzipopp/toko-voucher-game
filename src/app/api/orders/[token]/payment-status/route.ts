import { NextResponse } from "next/server";

import {
  fetchPakasirTransactionDetail,
  getPakasirConfig,
  normalizePakasirStatus,
} from "@/lib/payments/pakasir/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { token } = await context.params;

  if (!token || token.length < 32 || token.length > 256) {
    return NextResponse.json(
      { ok: false, state: "not_found" },
      {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_public_checkout_status",
    {
      p_access_token: token,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        state: "error",
        message: "Status pesanan belum dapat diperbarui.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  let status = data as {
    ok?: boolean;
    state?: string;
  } | null;

  if (status?.ok && ["awaiting_payment", "expired"].includes(String(status.state))) {
    const serviceSupabase = createServiceRoleClient();
    const { data: order } = await serviceSupabase
      .from("orders")
      .select("id, order_number, total_amount")
      .eq("access_token", token)
      .maybeSingle();

    const config = getPakasirConfig();

    if (order && config.enabled && config.slug && config.apiKey) {
      try {
        const detail = await fetchPakasirTransactionDetail({
          orderNumber: String(order.order_number),
          amount: Number(order.total_amount),
        });

        if (normalizePakasirStatus(detail.status) === "paid") {
          const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(_request.url).origin).replace(/\/$/, "");
          await fetch(`${siteUrl}/api/webhooks/pakasir`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              amount: detail.amount ?? order.total_amount,
              order_id: detail.order_id ?? order.order_number,
              project: detail.project ?? config.slug,
              status: detail.status ?? "completed",
              payment_method: detail.payment_method ?? "qris",
              completed_at: detail.completed_at ?? new Date().toISOString(),
              source: "status_fallback",
            }),
          });

          const refreshed = await supabase.rpc("get_public_checkout_status", {
            p_access_token: token,
          });
          if (!refreshed.error) {
            status = refreshed.data as typeof status;
          }
        }
      } catch {
        // Keep normal status response. Webhook remains the primary source;
        // this fallback only helps when provider webhook is delayed/not sent.
      }
    }
  }

  return NextResponse.json(status ?? { ok: false, state: "not_found" }, {
    status: status?.ok ? 200 : 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
