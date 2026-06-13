"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

export async function updateStoreSettings(formData: FormData) {
  const { supabase } = await requireAdmin();

  const values = {
    p_store_name: String(formData.get("store_name") ?? "").trim(),
    p_store_tagline: String(formData.get("store_tagline") ?? "").trim(),
    p_support_email: String(formData.get("support_email") ?? "").trim(),
    p_whatsapp_number: String(formData.get("whatsapp_number") ?? "").trim(),
    p_payment_window_minutes: Number(formData.get("payment_window_minutes") ?? 20),
    p_default_warranty_days: Number(formData.get("default_warranty_days") ?? 3),
    p_credential_visibility_days: Number(formData.get("credential_visibility_days") ?? 7),
  };

  const { error } = await supabase.rpc("admin_update_store_settings", values);

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?success=Pengaturan toko berhasil disimpan.");
}


export async function updateManualSalesSettings(formData: FormData) {
  const { supabase } = await requireAdmin();

  const enabled = formData.get("manual_sales_enabled") === "on";
  const instructions = String(
    formData.get("manual_payment_instructions") ?? "",
  ).trim();

  const { error } = await supabase.rpc(
    "admin_update_manual_sales_settings",
    {
      p_enabled: enabled,
      p_instructions: instructions,
    },
  );

  if (error) {
    redirect(
      `/admin/settings?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/admin/settings");

  redirect(
    "/admin/settings?success=Mode penjualan manual berhasil disimpan.",
  );
}
