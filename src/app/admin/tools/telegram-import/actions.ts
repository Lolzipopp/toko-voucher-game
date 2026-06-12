"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

const importRoot = path.join(process.cwd(), "private-import", "telegram-batch-01");

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

  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("id", user.id)
    .single();

  if (!admin?.is_active) redirect("/admin/login");
  return supabase;
}

async function readManifest(): Promise<ImportManifest> {
  const raw = await readFile(path.join(importRoot, "manifest.json"), "utf8");
  return JSON.parse(raw) as ImportManifest;
}

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : "Sinkronisasi Telegram gagal.";
}

async function syncEntryInventory(
  entry: ImportEntry,
  productId: string,
  adminSupabase: Awaited<ReturnType<typeof createClient>>,
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
) {
  if (!entry.username.trim() || !entry.password.trim()) {
    return { inserted: 0, skipped: 0, error: "username/password kosong" };
  }

  const { count, error: countError } = await serviceSupabase
    .from("inventory_accounts")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .is("archived_at", null);

  if (countError) {
    return { inserted: 0, skipped: 0, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return { inserted: 0, skipped: 1, error: null };
  }

  // Try the normal admin RPC first, then use the migration-32 repair RPC.
  // The fallback is needed by databases created before the bulk RPC was
  // committed to this repository.
  const bulk = await adminSupabase.rpc("admin_bulk_add_inventory_stock", {
    p_product_id: productId,
    p_accounts: [{ username: entry.username, password: entry.password }],
    p_purchase_cost: entry.purchase_cost,
    p_supplier: entry.supplier || null,
    p_notes: entry.notes || null,
  });

  if (!bulk.error) {
    const result = bulk.data as { inserted_count?: number; rejected_count?: number } | null;
    const inserted = result?.inserted_count ?? 0;
    if (inserted > 0) return { inserted, skipped: 0, error: null };
  }

  const fallback = await adminSupabase.rpc("admin_import_single_inventory_stock", {
    p_product_id: productId,
    p_username: entry.username,
    p_password: entry.password,
    p_purchase_cost: entry.purchase_cost,
    p_supplier: entry.supplier || null,
    p_notes: entry.notes || null,
  });

  if (fallback.error) {
    const firstError = bulk.error?.message;
    return {
      inserted: 0,
      skipped: 0,
      error: firstError
        ? `bulk: ${firstError}; fallback: ${fallback.error.message}`
        : fallback.error.message,
    };
  }

  const result = fallback.data as {
    inserted_count?: number;
    skipped_count?: number;
    reason?: string;
  } | null;

  return {
    inserted: result?.inserted_count ?? 0,
    skipped: result?.skipped_count ?? 0,
    error:
      (result?.inserted_count ?? 0) === 0 && (result?.skipped_count ?? 0) === 0
        ? result?.reason ?? "stok tidak berhasil dibuat"
        : null,
  };
}
async function syncEntryImages(
  entry: ImportEntry,
  productId: string,
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
) {
  const bucket = process.env.NEXT_PUBLIC_PRODUCT_IMAGES_BUCKET || "product-images";
  const { data: currentImages, error: currentImagesError } = await serviceSupabase
    .from("product_images")
    .select("storage_path, is_primary")
    .eq("product_id", productId);

  if (currentImagesError) throw currentImagesError;

  const existingPaths = new Set((currentImages ?? []).map((image) => image.storage_path));
  let hasPrimary = (currentImages ?? []).some((image) => image.is_primary);
  let uploaded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, relativeImagePath] of entry.images.entries()) {
    const storagePath = `${productId}/telegram-${entry.source_message_id}-${index + 1}.webp`;
    if (existingPaths.has(storagePath)) {
      skipped += 1;
      continue;
    }

    try {
      const image = await readFile(path.join(importRoot, relativeImagePath));
      const { error: uploadError } = await serviceSupabase.storage
        .from(bucket)
        .upload(storagePath, image, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "31536000",
        });

      if (uploadError) {
        errors.push(`upload gambar ${index + 1}: ${uploadError.message}`);
        continue;
      }

      const shouldBePrimary = !hasPrimary;
      const { error: insertError } = await serviceSupabase.from("product_images").insert({
        product_id: productId,
        storage_path: storagePath,
        alt_text: entry.name,
        is_primary: shouldBePrimary,
        sort_order: index,
      });

      if (insertError) {
        await serviceSupabase.storage.from(bucket).remove([storagePath]);
        errors.push(`metadata gambar ${index + 1}: ${insertError.message}`);
        continue;
      }

      hasPrimary = hasPrimary || shouldBePrimary;
      existingPaths.add(storagePath);
      uploaded += 1;
    } catch (error) {
      errors.push(`file gambar ${index + 1}: ${asMessage(error)}`);
    }
  }

  return { uploaded, skipped, errors };
}

export async function importTelegramBatch() {
  try {
    const supabase = await requireActiveAdmin();
    const serviceSupabase = createServiceRoleClient();
    const manifest = await readManifest();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .ilike("name", "%Blox Fruits%")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (gameError || !game) {
      throw new Error(gameError?.message ?? "Game Blox Fruits aktif tidak ditemukan.");
    }

    let created = 0;
    let existingCount = 0;
    let failed = 0;
    let uploaded = 0;
    let skippedImages = 0;
    let inventoryInserted = 0;
    let inventorySkipped = 0;
    const errors: string[] = [];

    for (const entry of manifest.entries) {
      try {
        const { data: existing, error: existingError } = await serviceSupabase
          .from("products")
          .select("id")
          .eq("product_code", entry.product_code)
          .maybeSingle();

        if (existingError) throw existingError;
        let productId = existing?.id as string | undefined;

        if (productId) {
          existingCount += 1;
        } else {
          const { data: newProductId, error: createError } = await supabase.rpc(
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

          if (createError || !newProductId) {
            throw new Error(createError?.message ?? "ID produk kosong");
          }
          productId = newProductId as string;

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
          if (merchError) throw merchError;

          created += 1;
        }

        const inventoryResult = await syncEntryInventory(
          entry,
          productId,
          supabase,
          serviceSupabase,
        );
        inventoryInserted += inventoryResult.inserted;
        inventorySkipped += inventoryResult.skipped;
        if (inventoryResult.error) {
          errors.push(`${entry.product_code}: stok: ${inventoryResult.error}`);
        }

        const imageResult = await syncEntryImages(entry, productId, serviceSupabase);
        uploaded += imageResult.uploaded;
        skippedImages += imageResult.skipped;
        for (const error of imageResult.errors) errors.push(`${entry.product_code}: ${error}`);
      } catch (error) {
        failed += 1;
        errors.push(`${entry.product_code}: ${asMessage(error)}`);
      }
    }

    const cleanup = await cleanupTestData(serviceSupabase);
    const publish = await enforceSafePublishing(manifest, serviceSupabase);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");

    for (const item of cleanup.errors) errors.push(`cleanup: ${item}`);
    for (const item of publish.errors) errors.push(`publish: ${item}`);

    const summary = [
      `${created} produk baru dibuat`,
      `${existingCount} produk lama ditemukan`,
      `${inventoryInserted} username/password dimasukkan`,
      `${inventorySkipped} stok sudah ada`,
      `${uploaded} gambar dipasang`,
      `${skippedImages} gambar sudah ada`,
      `${failed} produk gagal`,
      `${cleanup.productsDeleted} produk TEST dihapus`,
      `${cleanup.inventoryDeleted} stok TEST dihapus`,
      `${publish.ready} produk siap jual`,
      `${publish.draft} produk tetap draft`,
    ].join(" · ");
    const detail = errors.length > 0 ? ` Detail: ${errors.slice(0, 8).join(" | ")}` : "";
    redirect(`/admin/tools/telegram-import?success=${encodeURIComponent(summary + detail)}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin/tools/telegram-import?error=${encodeURIComponent(asMessage(error))}`);
  }
}


type CleanupResult = {
  productsDeleted: number;
  inventoryDeleted: number;
  skippedWithOrders: number;
  errors: string[];
};

async function cleanupTestData(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    productsDeleted: 0,
    inventoryDeleted: 0,
    skippedWithOrders: 0,
    errors: [],
  };

  const { data: testProducts, error } = await serviceSupabase
    .from("products")
    .select("id, name, product_code")
    .or("product_code.ilike.TEST-%,name.ilike.TEST %");

  if (error) {
    result.errors.push(`mencari produk test: ${error.message}`);
    return result;
  }

  for (const product of testProducts ?? []) {
    const { count: orderCount, error: orderError } = await serviceSupabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);

    if (orderError) {
      result.errors.push(`${product.product_code}: cek pesanan: ${orderError.message}`);
      continue;
    }

    if ((orderCount ?? 0) > 0) {
      result.skippedWithOrders += 1;
      await serviceSupabase
        .from("products")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", product.id);
      continue;
    }

    const { data: images } = await serviceSupabase
      .from("product_images")
      .select("storage_path")
      .eq("product_id", product.id);

    const { data: inventory, error: inventoryError } = await serviceSupabase
      .from("inventory_accounts")
      .select("id")
      .eq("product_id", product.id);

    if (inventoryError) {
      result.errors.push(`${product.product_code}: baca stok: ${inventoryError.message}`);
      continue;
    }

    const inventoryIds = (inventory ?? []).map((row) => row.id);
    if (inventoryIds.length > 0) {
      await serviceSupabase
        .from("stock_reservations")
        .delete()
        .in("inventory_account_id", inventoryIds);

      const { error: deleteInventoryError } = await serviceSupabase
        .from("inventory_accounts")
        .delete()
        .in("id", inventoryIds);

      if (deleteInventoryError) {
        result.errors.push(`${product.product_code}: hapus stok: ${deleteInventoryError.message}`);
        continue;
      }
      result.inventoryDeleted += inventoryIds.length;
    }

    await serviceSupabase.from("product_images").delete().eq("product_id", product.id);
    await serviceSupabase.from("product_attributes").delete().eq("product_id", product.id);
    await serviceSupabase.from("promo_code_products").delete().eq("product_id", product.id);

    const { error: deleteProductError } = await serviceSupabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (deleteProductError) {
      result.errors.push(`${product.product_code}: hapus produk: ${deleteProductError.message}`);
      continue;
    }

    const storagePaths = (images ?? []).map((image) => image.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      const bucket = process.env.NEXT_PUBLIC_PRODUCT_IMAGES_BUCKET || "product-images";
      await serviceSupabase.storage.from(bucket).remove(storagePaths);
    }

    result.productsDeleted += 1;
  }

  return result;
}

async function enforceSafePublishing(
  manifest: ImportManifest,
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
) {
  let ready = 0;
  let draft = 0;
  const errors: string[] = [];

  for (const entry of manifest.entries) {
    const { data: product, error: productError } = await serviceSupabase
      .from("products")
      .select("id, status")
      .eq("product_code", entry.product_code)
      .maybeSingle();

    if (productError || !product) {
      errors.push(`${entry.product_code}: validasi produk gagal`);
      continue;
    }

    const [{ count: inventoryCount }, { count: imageCount }] = await Promise.all([
      serviceSupabase
        .from("inventory_accounts")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id)
        .eq("status", "available")
        .is("archived_at", null),
      serviceSupabase
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id),
    ]);

    const canPublish =
      !entry.price_missing &&
      entry.price_normal > 1 &&
      (inventoryCount ?? 0) > 0 &&
      (imageCount ?? 0) > 0;

    const desiredStatus = canPublish ? "active" : "draft";
    const { error: updateError } = await serviceSupabase
      .from("products")
      .update({ status: desiredStatus })
      .eq("id", product.id);

    if (updateError) {
      errors.push(`${entry.product_code}: status: ${updateError.message}`);
      continue;
    }

    if (canPublish) ready += 1;
    else draft += 1;
  }

  return { ready, draft, errors };
}

export async function finalizeTelegramStoreLaunch() {
  try {
    await requireActiveAdmin();
    const serviceSupabase = createServiceRoleClient();
    const cleanup = await cleanupTestData(serviceSupabase);

    // Reuse the same import logic without redirecting by doing a local request
    // through the shared core below is intentionally avoided; server actions
    // cannot safely invoke another redirecting server action. Run the complete
    // sync inline by redirecting the user to the normal sync first when needed.
    const manifest = await readManifest();
    const publish = await enforceSafePublishing(manifest, serviceSupabase);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");

    const messages = [
      `${cleanup.productsDeleted} produk TEST dihapus`,
      `${cleanup.inventoryDeleted} stok TEST dihapus`,
      `${cleanup.skippedWithOrders} produk TEST berpesanan diarsipkan`,
      `${publish.ready} produk siap tampil`,
      `${publish.draft} produk diamankan sebagai draft`,
    ];
    const errors = [...cleanup.errors, ...publish.errors];
    const detail = errors.length > 0 ? ` Detail: ${errors.slice(0, 8).join(" | ")}` : "";
    redirect(`/admin/tools/telegram-import?success=${encodeURIComponent(messages.join(" · ") + detail)}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin/tools/telegram-import?error=${encodeURIComponent(asMessage(error))}`);
  }
}

export async function repairTelegramProductImages() {
  try {
    await requireActiveAdmin();
    const serviceSupabase = createServiceRoleClient();
    const manifest = await readManifest();

    let productsFound = 0;
    let productsMissing = 0;
    let uploaded = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of manifest.entries) {
      const { data: product, error } = await serviceSupabase
        .from("products")
        .select("id")
        .eq("product_code", entry.product_code)
        .maybeSingle();

      if (error) {
        errors.push(`${entry.product_code}: ${error.message}`);
        continue;
      }
      if (!product) {
        productsMissing += 1;
        continue;
      }

      productsFound += 1;
      const result = await syncEntryImages(entry, product.id, serviceSupabase);
      uploaded += result.uploaded;
      skipped += result.skipped;
      for (const item of result.errors) errors.push(`${entry.product_code}: ${item}`);
    }

    const summary = [
      `${productsFound} produk ditemukan`,
      `${productsMissing} produk belum ada`,
      `${uploaded} gambar dipasang`,
      `${skipped} gambar sudah ada`,
    ].join(" · ");
    const detail = errors.length > 0 ? ` Detail: ${errors.slice(0, 8).join(" | ")}` : "";
    redirect(`/admin/tools/telegram-import?success=${encodeURIComponent(summary + detail)}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/admin/tools/telegram-import?error=${encodeURIComponent(asMessage(error))}`);
  }
}
