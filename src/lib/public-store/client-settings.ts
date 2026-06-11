export type ClientPublicSettings = {
  store_name: string;
  store_tagline: string;
  support_email: string | null;
  whatsapp_number: string | null;
  payment_window_minutes: number;
  default_warranty_days: number;
  credential_visibility_days: number;
};

export const DEFAULT_CLIENT_SETTINGS: ClientPublicSettings = {
  store_name: "RIKU STORE",
  store_tagline: "Akun Roblox Instan",
  support_email: null,
  whatsapp_number: null,
  payment_window_minutes: 20,
  default_warranty_days: 3,
  credential_visibility_days: 7,
};

export async function fetchPublicSettings(
  signal?: AbortSignal,
): Promise<ClientPublicSettings> {
  try {
    const response = await fetch("/api/public/store-settings", {
      signal,
      cache: "no-store",
    });

    if (!response.ok) return DEFAULT_CLIENT_SETTINGS;

    const data = (await response.json()) as Partial<ClientPublicSettings>;
    return {
      ...DEFAULT_CLIENT_SETTINGS,
      ...data,
      store_name: data.store_name?.trim() || DEFAULT_CLIENT_SETTINGS.store_name,
      store_tagline:
        data.store_tagline?.trim() || DEFAULT_CLIENT_SETTINGS.store_tagline,
      support_email: data.support_email?.trim() || null,
      whatsapp_number: data.whatsapp_number?.replace(/\D/g, "") || null,
    };
  } catch {
    return DEFAULT_CLIENT_SETTINGS;
  }
}
