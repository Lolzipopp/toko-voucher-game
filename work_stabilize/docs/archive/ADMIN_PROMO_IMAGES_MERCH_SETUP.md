# RIKU STORE — Admin Promo, Product Images, Merchandising V1

## Fitur
1. Manajemen promo di `/admin/promos`
2. Upload dan kelola gambar produk di halaman edit produk
3. Pengaturan deskripsi, harga promo, masa promo, populer, urutan katalog, garansi

## Instalasi
1. Copy/replace seluruh isi paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260610000020_admin_promos_images_merchandising.sql`
3. Pastikan `.env.local` memiliki:
   `NEXT_PUBLIC_PRODUCT_IMAGES_BUCKET=product-images`
4. Jalankan:
   `npm.cmd install`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Batas gambar
- Maksimal 2 MB
- WebP, JPG, PNG
- Disarankan WebP 1200×675 di bawah 500 KB
