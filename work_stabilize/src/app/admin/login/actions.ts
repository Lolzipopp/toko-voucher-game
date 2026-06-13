"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Email dan password wajib diisi."),
    );
  }

  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Email atau password tidak valid."),
    );
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (adminError || !admin || !admin.is_active) {
    await supabase.auth.signOut();

    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Akun ini bukan admin aktif RIKU STORE."),
    );
  }

  redirect("/admin");
}