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

  return {
    gameId,
    name,
    productCode,
    productType,
    status,
    priceNormal,
    attributes: parseAttributes(rawAttributes),
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

  const { error } = await supabase.rpc("admin_create_product", {
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
