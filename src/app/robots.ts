import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.rikustore.my.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/products/",
          "/tentang-kontak",
          "/syarat-ketentuan",
          "/kebijakan-privasi",
          "/refund-garansi",
        ],
        disallow: [
          "/admin/",
          "/checkout/",
          "/order/",
          "/akun/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
