# RIKU STORE — Telegram Full Export Sync V1.9

Paket ini membaca 37 listing dari export Telegram 11 Juni 2026 dan menyertakan 70 foto produk yang sudah diubah ke WebP 1600×800.

## Perilaku sinkronisasi
- Produk lama dicari berdasarkan `product_code` dan tidak dibuat ulang.
- Gambar yang belum ada dipasang ke produk lama.
- Produk yang belum ada dibuat sebagai produk unik beserta satu stok terenkripsi.
- 23 produk yang punya harga dibuat aktif.
- 14 produk tanpa harga dibuat draft dengan placeholder Rp1 dan tidak tampil ke pembeli.

## Environment lokal sementara
```
ENABLE_INTERNAL_TEST_TOOLS=true
SUPABASE_SERVICE_ROLE_KEY=...
```

Jangan commit service role key. Setelah selesai, ubah `ENABLE_INTERNAL_TEST_TOOLS=false` dan restart aplikasi.

## Jalankan
```
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- -p 3001
```

Login admin, buka `/admin/tools/telegram-import`, lalu klik **Sinkronkan semuanya sekarang**.
