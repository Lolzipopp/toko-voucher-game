export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function productImageUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_PRODUCT_IMAGES_BUCKET ?? "product-images";
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}
