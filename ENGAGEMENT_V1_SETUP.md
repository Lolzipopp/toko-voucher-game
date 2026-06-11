# RIKU STORE — Engagement V1

## Testimoni dummy
Migration menambahkan 6 testimoni dummy sebagai draft:
- `is_approved = false`
- Tidak tampil di homepage
- Diberi label `KONTEN DEMO — jangan dipublikasikan`

Gunakan hanya untuk menguji tampilan admin. Ganti dengan testimoni asli sebelum dipublikasikan.

## Tiga fitur
1. Favorit/Wishlist tanpa login
2. Produk Baru Dilihat
3. Bagikan produk melalui salin link dan WhatsApp

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260611000028_engagement_demo_testimonials.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Halaman baru
- `/favorit`

## Catatan
Favorit dan riwayat produk disimpan di localStorage browser, sehingga:
- tidak membutuhkan akun,
- tidak menambah beban database,
- hanya tersedia di perangkat/browser yang sama.


## Revisi V1.1
- Memperbaiki `engagementProduct` yang sebelumnya berada sebelum variabel produk tersedia.
- Memperbaiki field kartu produk agar sesuai `PublicCatalogProduct`.
- Warning `Unknown at rule @theme` dari VS Code bukan error build. Itu sintaks Tailwind CSS v4.


## Revisi V1.2 — Client-safe Header & Footer
- `StoreHeader` dan `StoreFooter` tidak lagi mengimpor `next/headers`.
- Pengaturan publik diambil melalui browser Supabase client.
- Aman dipakai dari Client Component seperti checkout, cart, login, dan favorit.
