# RIKU STORE — Payment Window 20 Minutes V1

## Tiga fitur
1. Semua checkout baru memiliki batas pembayaran 20 menit.
2. Halaman menunggu pembayaran dengan countdown dan bahasa sederhana.
3. Order otomatis kedaluwarsa dan stok kembali tersedia.

## Instalasi
1. Copy/replace seluruh isi paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260610000018_payment_window_10_minutes.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Tes
1. Buat checkout publik.
2. Pastikan halaman menampilkan countdown sekitar 20:00.
3. Untuk tes cepat, ubah waktu order langsung di SQL atau tunggu 20 menit.
4. Setelah waktu habis, halaman harus menampilkan "Pesanan otomatis dibatalkan".
5. Stok harus kembali menjadi available.

## Catatan
- Istilah "reservasi" tidak ditampilkan ke pembeli.
- Backend tetap mengunci stok untuk mencegah double-selling.
- Jika pg_cron aktif, cleanup berjalan setiap menit.
- Polling halaman menjadi fallback bila pg_cron belum aktif.
