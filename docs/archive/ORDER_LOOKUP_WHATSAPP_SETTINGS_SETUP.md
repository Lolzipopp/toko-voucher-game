# RIKU STORE — Order Lookup, WhatsApp, Store Settings V1

## Fitur
1. Cek pesanan publik melalui nomor order + email di `/cek-pesanan`.
2. Tombol WhatsApp dari detail order admin.
3. Pengaturan toko di `/admin/settings`.

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan migration `supabase/migrations/20260610000025_order_lookup_whatsapp_settings.sql`.
3. Jalankan `npm.cmd install`, `npm.cmd run lint`, `npm.cmd run build`, lalu `npm.cmd run dev -- -p 3001`.

## Catatan
- Pencarian pesanan memiliki rate limit.
- Batas pembayaran dari pengaturan dipakai untuk checkout baru.
- Nomor WhatsApp disimpan dengan format internasional tanpa tanda +.
