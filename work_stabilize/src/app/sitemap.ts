import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.rikustore.my.id";

  return [
    "",
    "/tentang-kontak",
    "/syarat-ketentuan",
    "/kebijakan-privasi",
    "/refund-garansi",
    "/akun/login",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
