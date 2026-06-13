import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function allowed(key: string) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(key)) return new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.slice(0, 500) : "Client error";
    const pathname = typeof body.pathname === "string" ? body.pathname.slice(0, 300) : null;
    const digest = typeof body.digest === "string" ? body.digest.slice(0, 120) : null;
    const source = typeof body.source === "string" ? body.source.slice(0, 50) : "client";
    const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : null;

    const supabase = await createClient();
    await supabase.rpc("report_client_error", {
      p_message: message,
      p_pathname: pathname,
      p_digest: digest,
      p_source: source,
      p_user_agent: userAgent,
    });
  } catch {
    // Endpoint monitoring selalu gagal secara diam-diam agar tidak mengganggu user.
  }

  return new NextResponse(null, { status: 204 });
}
