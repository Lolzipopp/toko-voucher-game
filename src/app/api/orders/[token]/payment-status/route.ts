import { NextResponse } from "next/server";

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

  const status = data as {
    ok?: boolean;
    state?: string;
  } | null;

  return NextResponse.json(status ?? { ok: false, state: "not_found" }, {
    status: status?.ok ? 200 : 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
