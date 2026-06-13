# RIKU STORE — Production Monitoring V3.0

## Tujuan
Menambahkan halaman kesehatan operasional admin untuk mendeteksi reservasi kedaluwarsa, delivery gagal, email gagal, stok problem, dan produk aktif tanpa stok.

## Migration
Jalankan:

`supabase/migrations/20260613000035_admin_operational_health_v1.sql`

## Halaman baru
`/admin/health`

## Pemeriksaan

```powershell
npm.cmd ci
npm.cmd run check
```

## Acceptance criteria
- Admin dapat melihat angka masalah operasional.
- Admin dapat menjalankan repair reservasi kedaluwarsa.
- Non-admin tidak dapat memanggil RPC health.
- Tidak ada credential atau secret di halaman/log.
