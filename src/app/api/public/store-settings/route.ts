import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const DEFAULT_SETTINGS = {
  store_name: "RIKU STORE",
  store_tagline: "Akun Roblox Instan",
  support_email: null as string | null,
  whatsapp_number: null as string | null,
  payment_window_minutes: 20,
  default_warranty_days: 3,
  credential_visibility_days: 7,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_public_store_settings",
    );

    if (error || !data) {
      return NextResponse.json(DEFAULT_SETTINGS, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    return NextResponse.json(
      { ...DEFAULT_SETTINGS, ...(data as Record<string, unknown>) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  }
}
