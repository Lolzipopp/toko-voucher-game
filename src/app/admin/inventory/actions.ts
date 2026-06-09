"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  ok: boolean;
  message: string;
};

type BulkAccount = {
  username: string;
  password: string;
};

async function requireActiveAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, error: "Sesi login tidak ditemukan." };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) {
    return { supabase: null, error: "Akun bukan admin aktif." };
  }

  return { supabase, error: null };
}

function parseBulkAccounts(raw: string): BulkAccount[] {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    throw new Error("Belum ada data akun yang dipaste.");
  }

  if (rows.length > 500) {
    throw new Error("Maksimal 500 akun dalam satu kali import.");
  }

  const accounts: BulkAccount[] = [];
  const seen = new Set<string>();

  rows.forEach((line, index) => {
    const prefix = "USER:PW|";

    if (!line.startsWith(prefix)) {
      throw new Error(`Baris ${index + 1} harus diawali USER:PW|.`);
    }

    const credentials = line.slice(prefix.length);
    const separatorIndex = credentials.indexOf(":");

    if (separatorIndex <= 0) {
      throw new Error(`Username/password baris ${index + 1} tidak lengkap.`);
    }

    const username = credentials.slice(0, separatorIndex).trim();
    const password = credentials.slice(separatorIndex + 1);

    if (!username || !password.trim()) {
      throw new Error(`Username/password baris ${index + 1} kosong.`);
    }

    const normalizedUsername = username.toLowerCase();

    if (seen.has(normalizedUsername)) {
      throw new Error(`Username duplikat di baris ${index + 1}: ${username}`);
    }

    seen.add(normalizedUsername);
    accounts.push({ username, password });
  });

  return accounts;
}

export async function bulkAddInventory(input: {
  productId: string;
  rawAccounts: string;
  purchaseCost: number;
  supplier: string;
  notes: string;
}): Promise<ActionResult> {
  try {
    if (!input.productId) {
      return { ok: false, message: "Produk wajib dipilih." };
    }

    if (
      !Number.isSafeInteger(input.purchaseCost) ||
      input.purchaseCost < 0
    ) {
      return { ok: false, message: "Modal per akun tidak valid." };
    }

    const accounts = parseBulkAccounts(input.rawAccounts);
    const { supabase, error: authError } = await requireActiveAdmin();

    if (!supabase) {
      return { ok: false, message: authError ?? "Tidak memiliki akses." };
    }

    const { data, error } = await supabase.rpc(
      "admin_bulk_add_inventory_stock",
      {
        p_product_id: input.productId,
        p_accounts: accounts,
        p_purchase_cost: input.purchaseCost,
        p_supplier: input.supplier.trim() || null,
        p_notes: input.notes.trim() || null,
      },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    const result = data as {
      inserted_count?: number;
      rejected_count?: number;
    } | null;

    const inserted = result?.inserted_count ?? 0;
    const rejected = result?.rejected_count ?? 0;

    revalidatePath("/admin/inventory");

    return {
      ok: true,
      message:
        rejected > 0
          ? `${inserted} akun berhasil disimpan, ${rejected} ditolak.`
          : `${inserted} akun berhasil disimpan.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Import stok gagal.",
    };
  }
}

export async function updateInventoryStatus(input: {
  inventoryIds: string[];
  newStatus: "available" | "disabled" | "problem" | "archived";
  reason: string;
}): Promise<ActionResult> {
  if (input.inventoryIds.length === 0) {
    return { ok: false, message: "Belum ada stok yang dipilih." };
  }

  if (
    ["disabled", "problem", "archived"].includes(input.newStatus) &&
    !input.reason.trim()
  ) {
    return { ok: false, message: "Alasan wajib diisi." };
  }

  const { supabase, error: authError } = await requireActiveAdmin();

  if (!supabase) {
    return { ok: false, message: authError ?? "Tidak memiliki akses." };
  }

  const { data, error } = await supabase.rpc(
    "admin_update_inventory_status",
    {
      p_inventory_ids: input.inventoryIds,
      p_new_status: input.newStatus,
      p_reason: input.reason.trim() || null,
    },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = data as {
    updated_count?: number;
    rejected_count?: number;
  } | null;

  const updated = result?.updated_count ?? 0;
  const rejected = result?.rejected_count ?? 0;

  revalidatePath("/admin/inventory");

  return {
    ok: true,
    message:
      rejected > 0
        ? `${updated} stok berhasil diubah, ${rejected} ditolak.`
        : `${updated} stok berhasil diubah.`,
  };
}
