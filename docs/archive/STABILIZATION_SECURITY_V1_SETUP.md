# RIKU STORE — Stabilization & Security V1

## Perbaikan utama
- Checkout V3 dengan rate limit dan satu order aktif per email.
- Promo baru dihitung terpakai setelah pembayaran `paid`.
- Function status final tanpa enum `cancelled`.
- `order_source` menggantikan string `internal_notes` sebagai logika utama.
- Error checkout memakai kode terstruktur.
- Tool order dummy/simulasi hanya tampil jika `ENABLE_INTERNAL_TEST_TOOLS=true`.
- Config bisnis dipusatkan di `src/lib/config/store.ts`.
- Security headers global ditambahkan.
- Perbaikan manual migration 18/19 disimpan agar setup database baru tidak mengulang bug.

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan migration `supabase/migrations/20260610000022_stabilization_security_v1.sql`.
3. Tambahkan ke `.env.local`:
   `ENABLE_INTERNAL_TEST_TOOLS=false`
   `CHECKOUT_RATE_LIMIT_SECRET=<random panjang>`
4. Jalankan `npm.cmd install`, `npm.cmd run lint`, `npm.cmd run build`.

## Catatan
- Jangan pasang paket Admin Ops V1 lama.
- Token delivery hashing dan payment webhook tetap dikerjakan bersama integrasi payment gateway.
