# Order Dummy + Reservation Test V1

## 1. Jalankan migration

Buka Supabase SQL Editor dan jalankan seluruh isi:

`supabase/migrations/20260609000013_test_order_reservation.sql`

## 2. Build dan jalankan

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev -- -p 3001
```

Buka `/admin/orders`, buka panel **Order Dummy + Reservasi FIFO**, pilih produk, jumlah, dan durasi reservasi.

## Yang diuji

- Order, item, payment dummy, dan reservation dibuat dalam satu transaction.
- Stok dipilih FIFO oleh `reserve_stock_for_order`.
- `FOR UPDATE SKIP LOCKED` mencegah dua transaksi mengambil baris stok yang sama.
- Jika stok kurang, seluruh transaksi rollback; tidak ada order/reservasi parsial.
- Tombol **Lepaskan reservasi expired** mengubah order/payment test menjadi expired dan mengembalikan stok ke available.

## Test cepat

1. Pilih produk dengan minimal 2 stok available.
2. Buat order dummy quantity 1, reservation 1 menit.
3. Cek detail order dan halaman Stok: satu akun menjadi reserved.
4. Tunggu lewat 1 menit.
5. Klik **Lepaskan reservasi expired**.
6. Pastikan order menjadi expired dan stok kembali available.

## Race-condition test

Tes dua pembeli pada stok terakhir dilakukan setelah alur dasar ini lulus. Jalankan dua request create order hampir bersamaan untuk produk yang hanya memiliki satu stok available. Hanya satu yang boleh sukses; request lain harus mendapat `insufficient_stock`.
