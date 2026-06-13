import { createClient } from "@/lib/supabase/server";

export type PublicStoreSettings = {
  store_name: string;
  store_tagline: string;
  support_email: string | null;
  whatsapp_number: string | null;
  payment_window_minutes: number;
  default_warranty_days: number;
  credential_visibility_days: number;
};

const DEFAULT_SETTINGS: PublicStoreSettings = {
  store_name: "RIKU STORE",
  store_tagline: "Akun Roblox Instan",
  support_email: null,
  whatsapp_number: null,
  payment_window_minutes: 20,
  default_warranty_days: 3,
  credential_visibility_days: 7,
};

export async function getPublicStoreSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_public_store_settings",
  );

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...(data as Partial<PublicStoreSettings>),
  };
}

export function whatsappUrl(
  number: string | null,
  message: string,
) {
  if (!number) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
