# RIKU STORE — Order Release & Spec Overflow V3.4

## Perubahan

- Nilai spesifikasi panjang seperti `LOVE,CREATION,QUAKE,SPIDER,BLIZZARD` sekarang membungkus di dalam kartu dan tidak keluar dari layar.
- Admin dapat membatalkan order yang masih pending/processing dan langsung mengembalikan stok reserved menjadi available.
- Order yang dibatalkan memakai status `expired`, bukan `cancelled`, agar sesuai enum database.
- Order paid/delivered ditolak oleh database dan tidak dapat dilepas.
- Tindakan dicatat di audit log.

## Migration

Jalankan:

`supabase/migrations/20260613000037_admin_release_pending_order_v1.sql`

## Tes

1. Buat checkout dan biarkan pending.
2. Buka detail order admin.
3. Klik `Batalkan order & jadikan stok tersedia`.
4. Pastikan order/payment menjadi expired.
5. Pastikan stok kembali available.
6. Pastikan tombol tidak muncul pada order paid/delivered.
