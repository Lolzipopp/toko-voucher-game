# RIKU STORE — Production Stabilization V2.6

## Fokus batch

Batch ini aman untuk website live karena tidak mengubah schema database, checkout, reservation, payment, atau credential.

## Perubahan

1. Admin guard dipusatkan di `src/lib/auth/require-admin.ts`.
   - `requireAdmin()` untuk Server Component/page.
   - `requireAdminAction()` untuk Server Action yang perlu mengembalikan pesan, bukan redirect mentah.
2. Error database publik/admin dipetakan melalui `src/lib/errors/database.ts` agar pesan PostgreSQL/RPC mentah tidak tampil ke user.
3. Logging server terpusat di `src/lib/observability/server-log.ts` dengan redaksi key sensitif.
4. Dashboard admin menampilkan alert merah jika ada order dengan `delivery_status = delivery_failed`.
5. Alert menampilkan maksimal 5 order gagal terbaru dan link langsung ke detail order.
6. Halaman Pesanan mendapat filter khusus `Pengiriman gagal`.
7. Action penting berikut memakai admin guard/error handler baru:
   - konfirmasi pembayaran manual dan delivery,
   - simulasi delivery test,
   - release order test expired,
   - bulk input/update/delete inventory,
   - create/toggle promo,
   - kirim ulang email order.
8. Gagal kirim email tidak lagi menampilkan pesan provider mentah ke admin; detail aman tetap dicatat di server log dan tabel delivery.

## File utama yang berubah

- `src/lib/auth/require-admin.ts`
- `src/lib/errors/database.ts`
- `src/lib/observability/server-log.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/orders/actions.ts`
- `src/app/admin/orders/[id]/email-actions.ts`
- `src/app/admin/inventory/actions.ts`
- `src/app/admin/promos/actions.ts`

## Migration

Tidak ada migration baru. Migration terakhir tetap:

`20260613000033_unique_products_negotiable_v1.sql`

## Instalasi

Timpa isi project, tetapi pertahankan `.env.local` dan `.git`.

```powershell
cd "C:\Users\ASUS TUF A15\Documents\toko-voucher-game"
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev -- -p 3001
```

## Tes wajib

1. Login admin dan buka `/admin`.
2. Jika tidak ada delivery gagal, dashboard tidak menampilkan alert merah.
3. Jika ada delivery gagal, alert merah dan daftar order tampil.
4. Klik `Buka pesanan gagal`; URL menuju `/admin/orders?delivery=delivery_failed`.
5. Pastikan hanya order dengan delivery gagal yang tampil.
6. Buka order paid+delivered dan tes kirim ulang email.
7. Tes tambah satu stok dan ubah status stok.
8. Tes aktif/nonaktif promo.
9. Pastikan browser tidak menampilkan pesan SQL/RPC mentah.

## Rollback

Jika ada masalah, timpa kembali project menggunakan ZIP V2.5. Tidak perlu rollback database karena batch ini tidak memiliki migration.
