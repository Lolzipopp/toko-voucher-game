"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "/akun");

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/akun";
  }

  return next;
}

export async function sendCustomerOtp(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const next = safeNext(formData.get("next"));

  if (!email || !email.includes("@") || email.length > 254) {
    redirect(
      `/akun/login?error=${encodeURIComponent(
        "Masukkan alamat email yang valid.",
      )}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        account_type: "customer",
      },
    },
  });

  if (error) {
    const message =
      error.status === 429
        ? "Terlalu banyak permintaan kode. Tunggu sebentar lalu coba lagi."
        : "Kode belum dapat dikirim. Periksa email lalu coba lagi.";

    redirect(
      `/akun/login?error=${encodeURIComponent(
        message,
      )}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(
    `/akun/login?step=verify&email=${encodeURIComponent(
      email,
    )}&sent=1&next=${encodeURIComponent(next)}`,
  );
}

export async function verifyCustomerOtp(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const token = String(formData.get("token") ?? "")
    .replace(/\s/g, "")
    .trim();
  const next = safeNext(formData.get("next"));

  if (!email || !/^\d{6,10}$/.test(token)) {
    redirect(
      `/akun/login?step=verify&email=${encodeURIComponent(
        email,
      )}&error=${encodeURIComponent(
        "Masukkan kode angka yang dikirim ke email.",
      )}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    redirect(
      `/akun/login?step=verify&email=${encodeURIComponent(
        email,
      )}&error=${encodeURIComponent(
        "Kode salah atau sudah kedaluwarsa. Minta kode baru.",
      )}&next=${encodeURIComponent(next)}`,
    );
  }

  await supabase.rpc("claim_customer_orders");

  redirect(next);
}

export async function logoutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
