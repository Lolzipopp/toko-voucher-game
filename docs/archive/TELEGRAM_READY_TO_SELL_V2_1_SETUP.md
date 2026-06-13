# RIKU STORE — Telegram Ready to Sell V2.1

## Wajib
1. Pasang seluruh file paket ke folder project.
2. Jalankan migration `supabase/migrations/20260612000032_telegram_launch_finalize_v1.sql` di Supabase SQL Editor.
3. Pastikan `.env.local` berisi `SUPABASE_SERVICE_ROLE_KEY` dan `ENABLE_INTERNAL_TEST_TOOLS=true`.
4. Restart dev server.
5. Login admin dan buka `/admin/tools/telegram-import`.
6. Klik **Siapkan toko sekarang** satu kali.

Tombol tersebut:
- menyinkronkan 37 produk Telegram;
- memasang gambar;
- memasukkan username/password terenkripsi;
- menghapus produk dan inventory dengan kode/nama TEST jika belum terkait order;
- mengarsipkan TEST product yang memiliki histori order;
- hanya mengaktifkan produk yang memiliki harga, gambar, dan stok available;
- mempertahankan produk tanpa harga sebagai draft.

Setelah hasil sukses, cek `/admin/inventory`, lakukan satu order end-to-end, lalu ubah `ENABLE_INTERNAL_TEST_TOOLS=false` dan restart server.
