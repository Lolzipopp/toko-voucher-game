"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ProductAttribute = {
  attribute_key: string;
  attribute_value: string;
  display_order: number;
};

type ProductFormValues = {
  gameId: string;
  name: string;
  productCode: string;
  productType: "mass" | "unique";
  status: "active" | "draft" | "preorder" | "out_of_stock";
  priceNormal: number;
  attributes: ProductAttribute[];
  description: string;
  pricePromo: number | null;
  promoEndsAt: string | null;
  warrantyDays: number;
  isPopular: boolean;
  sortOrder: number;
  allowNegotiation: boolean;
  negotiationMinPrice: number | null;
};

function parseAttributes(raw: string): ProductAttribute[] {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const attributes: ProductAttribute[] = [];
  const seenKeys = new Set<string>();

  rows.forEach((line, index) => {
    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      throw new Error(`Format atribut baris ${index + 1} salah.`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || !value) {
      throw new Error(`Atribut baris ${index + 1} tidak lengkap.`);
    }

    const normalizedKey = key.toLowerCase();

    if (seenKeys.has(normalizedKey)) {
      throw new Error(`Atribut "${key}" ditulis lebih dari sekali.`);
    }

    seenKeys.add(normalizedKey);

    attributes.push({
      attribute_key: key,
      attribute_value: value,
      display_order: index,
    });
  });

  return attributes;
}

function validateProductForm(formData: FormData): ProductFormValues {
  const gameId = String(formData.get("game_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const productCode = String(formData.get("product_code") ?? "")
    .trim()
    .toUpperCase();
  const productType = String(formData.get("product_type") ?? "");
  const status = String(formData.get("status") ?? "");
  const priceNormal = Number(formData.get("price_normal") ?? 0);
  const rawAttributes = String(formData.get("attributes") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const pricePromoRaw = String(formData.get("price_promo") ?? "").trim();
  const promoEndsAtRaw = String(formData.get("promo_ends_at") ?? "").trim();
  const warrantyDays = Number(formData.get("warranty_days") ?? 3);
  const isPopular = formData.get("is_popular") === "on";
  const sortOrder = Number(formData.get("sort_order") ?? 100);
  const allowNegotiation =
    formData.get("allow_negotiation") === "on";
  const negotiationMinPriceRaw = String(
    formData.get("negotiation_min_price") ?? "",
  ).trim();
  const negotiationMinPrice = negotiationMinPriceRaw
    ? Number(negotiationMinPriceRaw)
    : null;

  if (!gameId || !name || !productCode || !productType || !status) {
    throw new Error("Semua kolom wajib harus diisi.");
  }

  if (!Number.isSafeInteger(priceNormal) || priceNormal <= 0) {
    throw new Error("Harga harus berupa angka lebih dari nol.");
  }

  if (productType !== "mass" && productType !== "unique") {
    throw new Error("Tipe produk tidak valid.");
  }

  if (
    status !== "active" &&
    status !== "draft" &&
    status !== "preorder" &&
    status !== "out_of_stock"
  ) {
    throw new Error("Status produk tidak valid.");
  }


  if (
    negotiationMinPrice !== null &&
    (
      !Number.isSafeInteger(negotiationMinPrice) ||
      negotiationMinPrice <= 0
    )
  ) {
    throw new Error(
      "Batas minimum nego harus berupa angka lebih dari nol.",
    );
  }

  const effectivePrice =
    pricePromoRaw && Number(pricePromoRaw) > 0
      ? Number(pricePromoRaw)
      : priceNormal;

  if (
    allowNegotiation &&
    negotiationMinPrice !== null &&
    negotiationMinPrice >= effectivePrice
  ) {
    throw new Error(
      "Batas minimum nego harus lebih rendah dari harga jual.",
    );
  }

  return {
    gameId,
    name,
    productCode,
    productType,
    status,
    priceNormal,
    attributes: parseAttributes(rawAttributes),
    description,
    pricePromo: pricePromoRaw ? Number(pricePromoRaw) : null,
    promoEndsAt: promoEndsAtRaw ? new Date(promoEndsAtRaw).toISOString() : null,
    warrantyDays: Number.isFinite(warrantyDays) ? Math.floor(warrantyDays) : 3,
    isPopular,
    sortOrder: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 100,
    allowNegotiation,
    negotiationMinPrice:
      allowNegotiation ? negotiationMinPrice : null,
  };
}

async function requireActiveAdmin() {
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
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return supabase;
}

export async function createProduct(formData: FormData) {
  let values: ProductFormValues;

  try {
    values = validateProductForm(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data produk tidak valid.";

    redirect(`/admin/products/new?error=${encodeURIComponent(message)}`);
  }

  const supabase = await requireActiveAdmin();

  const { data: productId, error } = await supabase.rpc("admin_create_product", {
    p_game_id: values.gameId,
    p_name: values.name,
    p_product_code: values.productCode,
    p_product_type: values.productType,
    p_price_normal: values.priceNormal,
    p_status: values.status,
    p_attributes: values.attributes,
  });

  if (error) {
    const message = error.message.includes("already used")
      ? "Kode produk sudah digunakan."
      : error.message;

    redirect(`/admin/products/new?error=${encodeURIComponent(message)}`);
  }

  if (productId) {
    const { error: merchError } = await supabase.rpc("admin_update_product_merchandising", {
      p_product_id: productId,
      p_description: values.description,
      p_price_promo: values.pricePromo,
      p_promo_ends_at: values.promoEndsAt,
      p_warranty_days: values.warrantyDays,
      p_is_popular: values.isPopular,
      p_sort_order: values.sortOrder,
    });

    if (merchError) {
      redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(merchError.message)}`);
    }

    const { error: negotiationError } = await supabase.rpc(
      "admin_update_product_negotiation",
      {
        p_product_id: productId,
        p_allow_negotiation: values.allowNegotiation,
        p_negotiation_min_price: values.negotiationMinPrice,
      },
    );

    if (negotiationError) {
      redirect(
        `/admin/products/${productId}/edit?error=${encodeURIComponent(
          negotiationError.message,
        )}`,
      );
    }

  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect("/admin/products?success=Produk berhasil dibuat.");
}

export async function updateProduct(
  productId: string,
  formData: FormData,
) {
  let values: ProductFormValues;

  try {
    values = validateProductForm(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data produk tidak valid.";

    redirect(
      `/admin/products/${productId}/edit?error=${encodeURIComponent(message)}`,
    );
  }

  const supabase = await requireActiveAdmin();

  const { error } = await supabase.rpc("admin_update_product", {
    p_product_id: productId,
    p_game_id: values.gameId,
    p_name: values.name,
    p_product_code: values.productCode,
    p_product_type: values.productType,
    p_price_normal: values.priceNormal,
    p_status: values.status,
    p_attributes: values.attributes,
  });

  if (error) {
    const message = error.message.includes("already used")
      ? "Kode produk sudah digunakan."
      : error.message;

    redirect(
      `/admin/products/${productId}/edit?error=${encodeURIComponent(message)}`,
    );
  }

  const { error: merchError } = await supabase.rpc("admin_update_product_merchandising", {
    p_product_id: productId,
    p_description: values.description,
    p_price_promo: values.pricePromo,
    p_promo_ends_at: values.promoEndsAt,
    p_warranty_days: values.warrantyDays,
    p_is_popular: values.isPopular,
    p_sort_order: values.sortOrder,
  });

  if (merchError) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(merchError.message)}`);
  }


  const { error: negotiationError } = await supabase.rpc(
    "admin_update_product_negotiation",
    {
      p_product_id: productId,
      p_allow_negotiation: values.allowNegotiation,
      p_negotiation_min_price: values.negotiationMinPrice,
    },
  );

  if (negotiationError) {
    redirect(
      `/admin/products/${productId}/edit?error=${encodeURIComponent(
        negotiationError.message,
      )}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect("/admin/products?success=Produk berhasil diperbarui.");
}

export async function archiveProduct(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");

  if (!productId) {
    redirect(
      `/admin/products?error=${encodeURIComponent("ID produk tidak valid.")}`,
    );
  }

  const supabase = await requireActiveAdmin();

  const { error } = await supabase.rpc("admin_archive_product", {
    p_product_id: productId,
  });

  if (error) {
    const message =
      error.message.includes("unsold inventory rows") ||
      error.message.includes("archive blocked")
        ? "Produk belum bisa diarsipkan karena masih memiliki stok yang belum terjual."
        : error.message;

    redirect(`/admin/products?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?success=Produk berhasil diarsipkan.");
}

export async function restoreProduct(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");

  if (!productId) {
    redirect(`/admin/products?view=archived&error=${encodeURIComponent("ID produk tidak valid.")}`);
  }

  const supabase = await requireActiveAdmin();
  const { error } = await supabase.rpc("admin_restore_product", { p_product_id: productId });

  if (error) {
    redirect(`/admin/products?view=archived&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?success=Produk dipulihkan sebagai draft.");
}


export async function uploadProductImage(
  productId: string,
  formData: FormData,
) {
  const supabase = await requireActiveAdmin();
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent("Pilih file gambar terlebih dahulu.")}`);
  }

  if (file.size > 2 * 1024 * 1024) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent("Ukuran gambar maksimal 2 MB.")}`);
  }

  if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent("Format gambar harus WebP, JPG, atau PNG.")}`);
  }

  const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const storagePath = `${productId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });

  if (uploadError) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: String(formData.get("alt_text") ?? "").trim() || null,
    is_primary: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });

  if (insertError) {
    await supabase.storage.from("product-images").remove([storagePath]);
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath("/");
  revalidatePath(`/products`);
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit?success=${encodeURIComponent("Gambar berhasil diupload.")}`);
}

export async function setPrimaryProductImage(formData: FormData) {
  const supabase = await requireActiveAdmin();
  const productId = String(formData.get("product_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");

  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId).eq("product_id", productId);

  if (error) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit?success=${encodeURIComponent("Gambar utama diperbarui.")}`);
}

export async function deleteProductImage(formData: FormData) {
  const supabase = await requireActiveAdmin();
  const productId = String(formData.get("product_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");

  const { data: image, error: readError } = await supabase
    .from("product_images")
    .select("storage_path, is_primary")
    .eq("id", imageId)
    .eq("product_id", productId)
    .single();

  if (readError || !image) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent("Gambar tidak ditemukan.")}`);
  }

  const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId);

  if (deleteError) {
    redirect(`/admin/products/${productId}/edit?error=${encodeURIComponent(deleteError.message)}`);
  }

  await supabase.storage.from("product-images").remove([image.storage_path]);

  if (image.is_primary) {
    const { data: nextImage } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    if (nextImage) {
      await supabase.from("product_images").update({ is_primary: true }).eq("id", nextImage.id);
    }
  }

  revalidatePath("/");
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit?success=${encodeURIComponent("Gambar dihapus.")}`);
}
