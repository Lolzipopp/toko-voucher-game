# RIKU STORE — 3 Features V1

Fitur: Email Delivery, Katalog Publik, Detail Produk Publik.

1. Copy/replace ke project terbaru.
2. Jalankan migration `20260609000016_email_catalog_product_detail.sql`.
3. Salin env baru dari `.env.example` ke `.env.local` bila diperlukan.
4. Build: `npm.cmd install` lalu `npm.cmd run build`.
5. Katalog: `/`; detail: `/products/[slug]`; email: detail order admin.

Email butuh RESEND_API_KEY dan RESEND_FROM_EMAIL. Tanpa itu, UI tetap build dan memberi pesan konfigurasi yang jelas.
