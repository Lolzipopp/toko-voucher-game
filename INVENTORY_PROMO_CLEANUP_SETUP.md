# RIKU STORE — Inventory & Promo Cleanup V1

## Perbaikan
1. Stok reserved yang lewat waktu otomatis kembali available.
2. Promo aktif/nonaktif dipisahkan dari promo kedaluwarsa.
3. Promo kedaluwarsa tidak memiliki tombol aktif/nonaktif.
4. Status archived dihapus dari modul stok.
5. Stok yang tidak dipakai dapat dihapus permanen.
6. Stok sold tidak tampil di Stok dan tetap dapat dilihat melalui detail Pesanan.

## Instalasi
1. Copy/replace seluruh isi paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260610000024_inventory_promo_cleanup.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Catatan
- Stok reserved dan sold tidak dapat dihapus.
- Stok yang sudah terhubung ke order tidak dapat dihapus.
- Halaman Stok otomatis menjalankan perbaikan reservasi kedaluwarsa sebelum mengambil data.
