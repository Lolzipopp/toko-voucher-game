# RIKU STORE — Production Scalability V2.7

Batch ini menambahkan pagination server-side untuk pesanan dan stok, serta memindahkan perhitungan ringkasan dashboard ke satu RPC database.

## Migration
Jalankan:

`supabase/migrations/20260613000034_admin_dashboard_metrics_v1.sql`

## Perubahan utama
- Pesanan: 25 data per halaman, search/status/delivery difilter langsung di database.
- Stok: 100 data per halaman, filter status difilter langsung di database.
- Dashboard: omzet dan seluruh counter dihitung di PostgreSQL, bukan mengambil semua order paid ke aplikasi.
- Index baru untuk query order dan inventory yang sering dipakai.
- Komponen pagination reusable untuk admin.

## Instalasi
1. Timpa file project, jangan hapus `.env.local` dan `.git`.
2. Jalankan migration 34 di Supabase SQL Editor.
3. Jalankan:
   - `npm.cmd ci`
   - `npm.cmd run lint`
   - `npm.cmd run typecheck`
   - `npm.cmd run build`
   - `npm.cmd run dev -- -p 3001`

## Tes
- Buka `/admin` dan pastikan seluruh statistik tampil.
- Buka `/admin/orders`, tes search, filter status, filter delivery gagal, dan tombol halaman.
- Buka `/admin/inventory`, tes filter status dan tombol halaman.
- Pastikan filter kembali ke halaman 1 saat status diganti.
