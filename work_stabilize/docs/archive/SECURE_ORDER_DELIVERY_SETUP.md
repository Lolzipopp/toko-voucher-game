# Secure Order Delivery V1

## Instalasi
1. Copy/replace paket ini ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260609000015_secure_order_delivery.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Tes
1. Buat order dummy.
2. Simulasikan paid + delivery.
3. Buka detail order admin.
4. Klik **Buka halaman pembeli**.
5. Pastikan username/password tampil.
6. Jangan membagikan URL token kepada orang lain.

## Keamanan
- Token order acak berfungsi sebagai otorisasi.
- RPC hanya mengembalikan kredensial untuk order paid + delivered.
- Kredensial otomatis tidak tersedia setelah `credentials_hidden_at`.
- Route memakai no-store, no-referrer, dan noindex.
