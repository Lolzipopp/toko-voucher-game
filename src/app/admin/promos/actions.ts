"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { databaseErrorMessage } from "@/lib/errors/database";
import { logServerError } from "@/lib/observability/server-log";

export async function createPromo(formData: FormData) {
  const { supabase } = await requireAdmin();

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const discountType = String(formData.get("discount_type") ?? "");
  const discountValue = Number(formData.get("discount_value") ?? 0);
  const minOrderAmount = Number(formData.get("min_order_amount") ?? 0);
  const maxDiscountRaw = String(
    formData.get("max_discount_amount") ?? "",
  ).trim();
  const usageLimitRaw = String(formData.get("usage_limit") ?? "").trim();
  const perCustomerRaw = String(
    formData.get("per_customer_limit") ?? "",
  ).trim();
  const validUntilRaw = String(formData.get("valid_until") ?? "").trim();

  if (!code || !/^[A-Z0-9_-]{3,30}$/.test(code)) {
    redirect(
      `/admin/promos?error=${encodeURIComponent("Kode promo harus 3–30 karakter, hanya huruf, angka, _ atau -.")}`,
    );
  }

  if (!["percentage", "fixed_amount"].includes(discountType)) {
    redirect(
      `/admin/promos?error=${encodeURIComponent("Tipe diskon tidak valid.")}`,
    );
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    redirect(
      `/admin/promos?error=${encodeURIComponent("Nilai diskon harus lebih dari nol.")}`,
    );
  }

  if (discountType === "percentage" && discountValue > 100) {
    redirect(
      `/admin/promos?error=${encodeURIComponent("Diskon persen maksimal 100%.")}`,
    );
  }

  const { error } = await supabase.from("promo_codes").insert({
    code,
    description: description || null,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_amount: minOrderAmount > 0 ? Math.floor(minOrderAmount) : null,
    max_discount_amount: maxDiscountRaw
      ? Math.floor(Number(maxDiscountRaw))
      : null,
    usage_limit: usageLimitRaw ? Math.floor(Number(usageLimitRaw)) : null,
    per_customer_limit: perCustomerRaw
      ? Math.floor(Number(perCustomerRaw))
      : null,
    valid_until: validUntilRaw ? new Date(validUntilRaw).toISOString() : null,
    is_active: true,
  });

  if (error) {
    logServerError("admin_promo_create_failed", error);
    redirect(
      `/admin/promos?error=${encodeURIComponent(databaseErrorMessage(error, "Promo belum dapat dibuat."))}`,
    );
  }

  revalidatePath("/admin/promos");
  redirect("/admin/promos?success=Promo berhasil dibuat.");
}

export async function togglePromo(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("promo_id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  const { error } = await supabase
    .from("promo_codes")
    .update({ is_active: !active })
    .eq("id", id);

  if (error) {
    logServerError("admin_promo_toggle_failed", error, { promoId: id });
    redirect(
      `/admin/promos?error=${encodeURIComponent(databaseErrorMessage(error, "Status promo belum dapat diubah."))}`,
    );
  }

  revalidatePath("/admin/promos");
  redirect(
    `/admin/promos?success=${encodeURIComponent(active ? "Promo dinonaktifkan." : "Promo diaktifkan.")}`,
  );
}
