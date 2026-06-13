# Telegram Image Repair V1.8

## Tujuan

Memperbaiki gambar pada produk Telegram batch 01 yang produknya sudah berhasil dibuat, tetapi upload gambarnya gagal karena proses sebelumnya memakai session admin biasa dan terkena kebijakan Supabase Storage.

## File yang berubah

- `src/lib/supabase/service-role.ts`
- `src/app/admin/tools/telegram-import/actions.ts`
- `src/app/admin/tools/telegram-import/page.tsx`

## Migration

Tidak ada migration baru.

## Environment variable wajib

Tambahkan hanya di `.env.local` dan Vercel server environment, jangan pernah diekspos ke browser:

```env
SUPABASE_SERVICE_ROLE_KEY=...
ENABLE_INTERNAL_TEST_TOOLS=true
```

`SUPABASE_SERVICE_ROLE_KEY` bisa diambil dari Supabase Dashboard > Project Settings > API.

## Menjalankan repair

1. Login admin.
2. Buka `/admin/tools/telegram-import`.
3. Klik **Perbaiki semua gambar sekarang**.
4. Tunggu ringkasan jumlah gambar berhasil/gagal.
5. Periksa halaman produk.
6. Setelah selesai, set kembali `ENABLE_INTERNAL_TEST_TOOLS=false` dan restart server.

Repair aman dijalankan ulang. Gambar yang sudah memiliki `storage_path` yang sama akan dilewati dan tidak diduplikasi.
