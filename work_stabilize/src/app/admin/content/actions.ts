"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

function go(message: string, type: "success" | "error" = "success") {
  redirect(
    `/admin/content?${type}=${encodeURIComponent(message)}`,
  );
}

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw).toISOString() : null;
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const buttonLabel = String(formData.get("button_label") ?? "").trim();
  const buttonUrl = String(formData.get("button_url") ?? "").trim();
  const tone = String(formData.get("tone") ?? "promo");
  const sortOrder = Number(formData.get("sort_order") ?? 100);
  const image = formData.get("image");

  if (!title || !message) {
    go("Judul dan isi pengumuman wajib diisi.", "error");
  }

  if (!["promo", "info", "warning"].includes(tone)) {
    go("Warna pengumuman tidak valid.", "error");
  }

  if (buttonUrl && !buttonUrl.startsWith("/")) {
    go("Link tombol harus diawali / agar tetap aman.", "error");
  }

  let imagePath: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (image.size > 4 * 1024 * 1024) {
      go("Ukuran banner maksimal 4 MB.", "error");
    }
    if (!["image/webp", "image/jpeg", "image/png"].includes(image.type)) {
      go("Format banner harus WebP, JPG, atau PNG.", "error");
    }
    const extension = image.type === "image/webp" ? "webp" : image.type === "image/png" ? "png" : "jpg";
    imagePath = `homepage-banners/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(imagePath, image, { contentType: image.type, upsert: false, cacheControl: "31536000" });
    if (uploadError) go(uploadError.message, "error");
  }

  const { error } = await supabase.from("site_announcements").insert({
    title,
    message,
    button_label: buttonLabel || null,
    button_url: buttonUrl || null,
    tone,
    is_active: true,
    starts_at: optionalDate(formData.get("starts_at")),
    ends_at: optionalDate(formData.get("ends_at")),
    sort_order: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 100,
    image_path: imagePath,
    created_by: user.id,
  });

  if (error) {
    if (imagePath) await supabase.storage.from("product-images").remove([imagePath]);
    go(error.message, "error");
  }

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("Banner berhasil ditambahkan.");
}

export async function toggleAnnouncement(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("current") ?? "") === "true";

  const { error } = await supabase
    .from("site_announcements")
    .update({ is_active: !current, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go(current ? "Banner dinonaktifkan." : "Banner diaktifkan.");
}

export async function deleteAnnouncement(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const { data: banner } = await supabase
    .from("site_announcements")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("site_announcements")
    .delete()
    .eq("id", id);

  if (error) go(error.message, "error");
  if (banner?.image_path) {
    await supabase.storage.from("product-images").remove([banner.image_path]);
  }

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("Banner dihapus.");
}

export async function createTestimonial(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerRole = String(formData.get("customer_role") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const productLabel = String(formData.get("product_label") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 5);

  if (!customerName || !content) {
    go("Nama dan isi testimoni wajib diisi.", "error");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    go("Rating harus antara 1 sampai 5.", "error");
  }

  const { error } = await supabase.from("customer_testimonials").insert({
    customer_name: customerName,
    customer_role: customerRole || null,
    content,
    product_label: productLabel || null,
    rating,
    is_approved: true,
    is_featured: formData.get("is_featured") === "on",
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    created_by: user.id,
  });

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("Testimoni berhasil ditambahkan.");
}

export async function toggleTestimonial(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  const current = String(formData.get("current") ?? "") === "true";

  if (!["is_approved", "is_featured"].includes(field)) {
    go("Tindakan testimoni tidak valid.", "error");
  }

  const update: Record<string, unknown> = {
    [field]: !current,
    updated_at: new Date().toISOString(),
  };

  if (field === "is_approved" && !current) {
    update.approved_by = user.id;
    update.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("customer_testimonials")
    .update(update)
    .eq("id", id);

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("Status testimoni diperbarui.");
}

export async function deleteTestimonial(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase
    .from("customer_testimonials")
    .delete()
    .eq("id", id);

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("Testimoni dihapus.");
}

export async function createFaq(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 100);
  if (!question || !answer) {
    go("Pertanyaan dan jawaban wajib diisi.", "error");
  }

  const { error } = await supabase.from("faq_items").insert({
    question,
    answer,
    is_active: true,
    sort_order: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 100,
    created_by: user.id,
  });

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("FAQ berhasil ditambahkan.");
}

export async function toggleFaq(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("current") ?? "") === "true";

  const { error } = await supabase
    .from("faq_items")
    .update({ is_active: !current, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("Status FAQ diperbarui.");
}

export async function deleteFaq(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase.from("faq_items").delete().eq("id", id);

  if (error) go(error.message, "error");

  revalidatePath("/");
  revalidatePath("/admin/content");
  go("FAQ dihapus.");
}
