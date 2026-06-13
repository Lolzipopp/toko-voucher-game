import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  return { supabase, user, admin };
}
