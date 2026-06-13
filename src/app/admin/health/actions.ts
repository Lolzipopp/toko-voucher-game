"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAction } from "@/lib/auth/require-admin";
import { databaseErrorMessage } from "@/lib/errors/database";
import { logServerError } from "@/lib/observability/server-log";

export async function repairExpiredReservationsAction() {
  const auth = await requireAdminAction();
  if (!auth.ok) {
    redirect(`/admin/login?error=${encodeURIComponent(auth.message)}`);
  }

  const { data, error } = await auth.supabase.rpc("repair_expired_stock_reservations");

  if (error) {
    logServerError("admin.health.repair_expired_reservations_failed", error);
    redirect(`/admin/health?error=${encodeURIComponent(databaseErrorMessage(error, "Reservasi kedaluwarsa belum berhasil diperbaiki."))}`);
  }

  const result = (data ?? {}) as {
    released_reservations?: number;
    released_inventory?: number;
    expired_orders?: number;
  };

  revalidatePath("/admin");
  revalidatePath("/admin/health");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/orders");

  const message = [
    `${Number(result.released_reservations ?? 0)} reservasi dilepas`,
    `${Number(result.released_inventory ?? 0)} stok dikembalikan`,
    `${Number(result.expired_orders ?? 0)} order diubah menjadi kedaluwarsa`,
  ].join(" · ");

  redirect(`/admin/health?success=${encodeURIComponent(message)}`);
}


export async function resolveAppErrorsAction() {
  const auth = await requireAdminAction();
  if (!auth.ok) redirect(`/admin/login?error=${encodeURIComponent(auth.message)}`);

  const { error } = await auth.supabase
    .from("app_error_events")
    .update({ resolved_at: new Date().toISOString(), resolved_by: auth.user.id })
    .is("resolved_at", null);

  if (error) {
    logServerError("admin.health.resolve_app_errors_failed", error);
    redirect(`/admin/health?error=${encodeURIComponent(databaseErrorMessage(error, "Error belum berhasil ditandai selesai."))}`);
  }

  revalidatePath("/admin/health");
  redirect(`/admin/health?success=${encodeURIComponent("Semua error aplikasi sudah ditandai selesai.")}`);
}
