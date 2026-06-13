# RIKU STORE — Production Code Cleanup V3.1

## Tujuan
Mengurangi duplikasi format rupiah dan URL WhatsApp tanpa mengubah alur checkout, stok, payment, atau database.

## Perubahan utama
- Menambahkan formatter terpusat di `src/lib/format/display.ts`.
- Menambahkan helper WhatsApp terpusat di `src/lib/whatsapp/url.ts`.
- Mengganti formatter rupiah duplikat di halaman admin, akun pembeli, order, favorit, dan komponen toko.
- Mengganti pembuatan URL WhatsApp manual pada footer, restock, share produk, dan nego.
- Menambahkan test formatter dan WhatsApp helper.
- Total automated test menjadi 11.

## Migration
Tidak ada migration baru. Migration terakhir tetap `20260613000035_admin_operational_health_v1.sql`.

## Instalasi
Timpa project, tetapi pertahankan `.env.local` dan `.git`.

## Pemeriksaan
```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run check:production
npm.cmd run build
```
