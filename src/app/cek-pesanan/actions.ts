"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function lookupOrder(formData: FormData) {
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!orderNumber || !email) {
    redirect("/cek-pesanan?error=Nomor order dan email wajib diisi.");
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const secret = process.env.CHECKOUT_RATE_LIMIT_SECRET || "local-dev";
  const requestKey = createHash("sha256").update(`${ip}|${email}|lookup|${secret}`).digest("hex");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_public_order", {
    p_order_number: orderNumber,
    p_customer_email: email,
    p_request_key: requestKey,
  });

  if (error) redirect("/cek-pesanan?error=Status pesanan belum bisa diperiksa.");
  const result = data as { ok?: boolean; code?: string; access_token?: string } | null;

  if (!result?.ok || !result.access_token) {
    const message = result?.code === "RATE_LIMIT"
      ? "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi."
      : "Pesanan tidak ditemukan. Periksa nomor order dan email.";
    redirect(`/cek-pesanan?error=${encodeURIComponent(message)}`);
  }

  redirect(`/checkout/success/${result.access_token}`);
}
