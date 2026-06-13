"use server";

import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/lib/auth/require-admin";
import { databaseErrorMessage } from "@/lib/errors/database";
import { logServerError } from "@/lib/observability/server-log";

export type ActionResult = {
  ok: boolean;
  message: string;
};

type BulkAccount = {
  username: string;
  password: string;
};

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

    if (!Number.isSafeInteger(input.purchaseCost) || input.purchaseCost < 0) {
      return { ok: false, message: "Modal per akun tidak valid." };
    }

    const accounts = parseBulkAccounts(input.rawAccounts);
    const auth = await requireAdminAction();
    if (!auth.ok) return { ok: false, message: auth.message };
    const { supabase } = auth;

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
      logServerError("admin_inventory_bulk_add_failed", error, {
        productId: input.productId,
        accountCount: accounts.length,
      });
      return {
        ok: false,
        message: databaseErrorMessage(
          error,
          "Stok belum dapat disimpan. Periksa data lalu coba lagi.",
        ),
      };
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
      message: error instanceof Error ? error.message : "Import stok gagal.",
    };
  }
}

export async function updateInventoryStatus(input: {
  inventoryIds: string[];
  newStatus: "available" | "disabled" | "problem";
  reason: string;
}): Promise<ActionResult> {
  if (input.inventoryIds.length === 0) {
    return { ok: false, message: "Belum ada stok yang dipilih." };
  }

  if (
    ["disabled", "problem"].includes(input.newStatus) &&
    !input.reason.trim()
  ) {
    return { ok: false, message: "Alasan wajib diisi." };
  }

  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, message: auth.message };
  const { supabase } = auth;

  const { data, error } = await supabase.rpc("admin_update_inventory_status", {
    p_inventory_ids: input.inventoryIds,
    p_new_status: input.newStatus,
    p_reason: input.reason.trim() || null,
  });

  if (error) {
    logServerError("admin_inventory_action_failed", error);
    return {
      ok: false,
      message: databaseErrorMessage(
        error,
        "Perubahan stok belum dapat disimpan.",
      ),
    };
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

export async function deleteInventoryStock(input: {
  inventoryIds: string[];
  reason: string;
}): Promise<ActionResult> {
  if (input.inventoryIds.length === 0) {
    return { ok: false, message: "Belum ada stok yang dipilih." };
  }

  if (!input.reason.trim()) {
    return { ok: false, message: "Alasan penghapusan wajib diisi." };
  }

  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, message: auth.message };
  const { supabase } = auth;

  const { data, error } = await supabase.rpc("admin_delete_inventory_stock", {
    p_inventory_ids: input.inventoryIds,
    p_reason: input.reason.trim(),
  });

  if (error) {
    logServerError("admin_inventory_action_failed", error);
    return {
      ok: false,
      message: databaseErrorMessage(
        error,
        "Perubahan stok belum dapat disimpan.",
      ),
    };
  }

  const result = data as {
    deleted_count?: number;
    rejected_count?: number;
  } | null;

  const deleted = result?.deleted_count ?? 0;
  const rejected = result?.rejected_count ?? 0;

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  return {
    ok: true,
    message:
      rejected > 0
        ? `${deleted} stok dihapus, ${rejected} ditolak karena masih terhubung ke pesanan atau sedang ditahan.`
        : `${deleted} stok berhasil dihapus.`,
  };
}
