"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { redirect, unstable_rethrow } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ImportAttribute = {
  attribute_key: string;
  attribute_value: string;
  display_order: number;
};

type ImportEntry = {
  source_message_id: string;
  product_code: string;
  name: string;
  status: "active" | "draft";
  price_normal: number;
  price_missing: boolean;
  description: string;
  attributes: ImportAttribute[];
  username: string;
  password: string;
  purchase_cost: number;
  supplier: string;
  notes: string;
  images: string[];
};

type ImportManifest = {
  batch_id: string;
  game_slug: string;
  entries: ImportEntry[];
};

const importRoot = path.join(
  process.cwd(),
  "private-import",
  "telegram-batch-01",
);

async function requireActiveAdmin() {
  if (process.env.ENABLE_INTERNAL_TEST_TOOLS !== "true") {
    throw new Error(
      "Import lokal dinonaktifkan. Set ENABLE_INTERNAL_TEST_TOOLS=true di .env.local lalu restart dev server.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

async function readManifest(): Promise<ImportManifest> {
  const raw = await readFile(path.join(importRoot, "manifest.json"), "utf8");
  return JSON.parse(raw) as ImportManifest;
}

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : "Import Telegram gagal.";
}

export async function importTelegramBatch() {
  try {
    const supabase = await requireActiveAdmin();
    const manifest = await readManifest();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, name")
      .ilike("name", "%Blox Fruits%")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (gameError || !game) {
      throw new Error(
        gameError?.message ?? "Game Blox Fruits aktif tidak ditemukan.",
      );
    }

    let created = 0;
    let skipped = 0;
    let failed = 0;
    let imageCount = 0;
    const errors: string[] = [];

    for (const entry of manifest.entries) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("product_code", entry.product_code)
        .maybeSingle();

      if (existing) {
        skipped += 1;
        continue;
      }

      const { data: productId, error: createError } = await supabase.rpc(
        "admin_create_product",
        {
          p_game_id: game.id,
          p_name: entry.name,
          p_product_code: entry.product_code,
          p_product_type: "unique",
          p_price_normal: entry.price_normal,
          p_status: entry.status,
          p_attributes: entry.attributes,
        },
      );

      if (createError || !productId) {
        failed += 1;
        errors.push(
          `${entry.product_code}: ${createError?.message ?? "ID produk kosong"}`,
        );
        continue;
      }

      const { error: merchError } = await supabase.rpc(
        "admin_update_product_merchandising",
        {
          p_product_id: productId,
          p_description: entry.description,
          p_price_promo: null,
          p_promo_ends_at: null,
          p_warranty_days: 3,
          p_is_popular: false,
          p_sort_order: 100,
        },
      );

      if (merchError) {
        failed += 1;
        errors.push(`${entry.product_code}: ${merchError.message}`);
        continue;
      }

      const { error: inventoryError } = await supabase.rpc(
        "admin_bulk_add_inventory_stock",
        {
          p_product_id: productId,
          p_accounts: [
            {
              username: entry.username,
              password: entry.password,
            },
          ],
          p_purchase_cost: entry.purchase_cost,
          p_supplier: entry.supplier,
          p_notes: entry.notes,
        },
      );

      if (inventoryError) {
        failed += 1;
        errors.push(`${entry.product_code}: stok - ${inventoryError.message}`);
        continue;
      }

      for (const [index, relativeImagePath] of entry.images.entries()) {
        const imagePath = path.join(importRoot, relativeImagePath);
        const image = await readFile(imagePath);
        const storagePath = `${productId}/telegram-${entry.source_message_id}-${index + 1}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(storagePath, image, {
            contentType: "image/webp",
            upsert: false,
            cacheControl: "31536000",
          });

        if (uploadError) {
          errors.push(
            `${entry.product_code}: gambar ${index + 1} - ${uploadError.message}`,
          );
          continue;
        }

        const { error: imageRowError } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            storage_path: storagePath,
            alt_text: entry.name,
            is_primary: index === 0,
            sort_order: index,
          });

        if (imageRowError) {
          await supabase.storage.from("product-images").remove([storagePath]);
          errors.push(
            `${entry.product_code}: metadata gambar ${index + 1} - ${imageRowError.message}`,
          );
          continue;
        }

        imageCount += 1;
      }

      created += 1;
    }

    const summary = [
      `${created} produk dibuat`,
      `${skipped} dilewati karena sudah ada`,
      `${failed} gagal`,
      `${imageCount} gambar diupload`,
    ].join(" · ");

    const detail = errors.length > 0 ? ` Detail: ${errors.slice(0, 5).join(" | ")}` : "";

    redirect(
      `/admin/tools/telegram-import?success=${encodeURIComponent(summary + detail)}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      `/admin/tools/telegram-import?error=${encodeURIComponent(asMessage(error))}`,
    );
  }
}
