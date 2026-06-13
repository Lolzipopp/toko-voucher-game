import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
};

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !admin?.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return { supabase, user, admin: { ...admin, email: admin.email ?? user.email ?? "" } as AdminProfile };
}

export async function requireAdminAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      message: "Sesi admin sudah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !admin?.is_active) {
    return {
      ok: false as const,
      message: "Akses admin ditolak.",
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
    admin: { ...admin, email: admin.email ?? user.email ?? "" } as AdminProfile,
  };
}
