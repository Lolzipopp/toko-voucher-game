# RIKU STORE — Manual Sales Launch V1

Paket ini memungkinkan toko menerima order nyata hari ini tanpa Midtrans.

## Alur pembeli
1. Pilih produk.
2. Masukkan email dan promo.
3. Sistem menghitung total.
4. Sistem membuat order dan menahan stok.
5. Pembeli membuka WhatsApp dengan nomor order dan total.
6. Admin memberikan instruksi pembayaran manual.

## Alur admin
1. Periksa bukti dan mutasi bank/e-wallet.
2. Buka Admin → Pesanan → detail order.
3. Klik `Pembayaran sudah masuk — kirim akun`.
4. Sistem menandai paid, mengubah stok menjadi sold, dan mengirim akun ke halaman pesanan pembeli.

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260611000029_manual_sales_launch_v1.sql`
3. Buka `/admin/settings`.
4. Pastikan nomor WhatsApp benar.
5. Aktifkan `Mode pembayaran manual via WhatsApp`.
6. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Sebelum jual
- Upload foto produk dari halaman Edit Produk.
- Masukkan stok username/password di menu Stok.
- Pastikan produk berstatus aktif.
- Tes satu transaksi sendiri.
- Jangan klik konfirmasi pembayaran sebelum uang benar-benar masuk.
