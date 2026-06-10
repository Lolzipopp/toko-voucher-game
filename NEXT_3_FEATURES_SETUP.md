# Keranjang + Checkout + Reservasi Stok V1

## Fitur
1. Keranjang berbasis localStorage.
2. Checkout tanpa login menggunakan email.
3. Order asli + reservasi stok FIFO selama 20 menit dalam satu transaksi.

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260610000017_public_cart_checkout_reservation.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Tes
- Tambahkan produk dari detail produk.
- Buka `/cart`, ubah jumlah.
- Checkout menggunakan email asli.
- Pastikan order muncul di Admin > Pesanan.
- Pastikan stok berubah `available` ke `reserved`.
- Payment gateway belum terpasang, sehingga order tetap pending.
