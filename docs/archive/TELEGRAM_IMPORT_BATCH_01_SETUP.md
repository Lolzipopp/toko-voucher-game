# Telegram Import Batch 01

Tool lokal: `/admin/tools/telegram-import`

## Isi batch
- 27 produk unik
- 17 produk aktif dengan harga dari chat
- 10 produk draft karena harga kosong
- 54 gambar yang sudah dioptimalkan
- 1 stok terenkripsi per produk melalui RPC existing

## Cara menjalankan
1. Jangan push folder `private-import` ke Git. Folder sudah masuk `.gitignore`.
2. Tambahkan sementara ke `.env.local`:
   `ENABLE_INTERNAL_TEST_TOOLS=true`
3. Restart dev server.
4. Login admin.
5. Buka `http://localhost:3001/admin/tools/telegram-import`.
6. Periksa ringkasan lalu klik import satu kali.
7. Produk dengan harga kosong dibuat `draft` dan memakai placeholder Rp1. Isi harga sebenarnya sebelum diaktifkan.
8. Setelah sukses, ubah kembali `ENABLE_INTERNAL_TEST_TOOLS=false` dan restart server.

Import idempotent berdasarkan `product_code` TG-<message id>; produk yang sudah ada akan dilewati.
