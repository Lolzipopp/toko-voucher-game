# RIKU STORE — Search & Telegram Credential Sync V2.0

## Perubahan
- Tombol Cari homepage tidak lagi melakukan full page refresh.
- Hasil pencarian tetap mengarah dan scroll ke bagian `#produk`.
- Sinkronisasi Telegram kini mengisi username/password untuk produk lama yang belum mempunyai inventory.
- Username/password masuk melalui RPC `admin_bulk_add_inventory_stock`, sehingga mengikuti enkripsi database.
- Produk yang sudah memiliki inventory dilewati agar stok tidak terduplikasi.

## Cara menjalankan sinkronisasi
1. Set `ENABLE_INTERNAL_TEST_TOOLS=true`.
2. Pastikan `SUPABASE_SERVICE_ROLE_KEY` tersedia hanya di `.env.local`.
3. Login admin dan buka `/admin/tools/telegram-import`.
4. Klik **Sinkronkan semuanya sekarang**.
5. Periksa ringkasan jumlah username/password yang dimasukkan dan stok yang dilewati.
6. Setelah selesai, set `ENABLE_INTERNAL_TEST_TOOLS=false` dan restart server.

## Migration
Tidak ada migration baru.
