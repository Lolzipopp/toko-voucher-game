# Promo Checkout + Final Summary V1

## Tiga fitur
1. Kode promo publik di checkout.
2. Ringkasan subtotal, diskon, dan total final sebelum order dibuat.
3. Halaman status order menampilkan promo dan penghematan.

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan `supabase/migrations/20260610000019_public_promo_checkout.sql`.
3. Jalankan `npm.cmd install`, `npm.cmd run build`, lalu dev server.

## Membuat promo untuk tes
Gunakan SQL Editor, contoh:
```sql
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, per_customer_limit, valid_until)
VALUES ('RIKU10', 'Diskon 10 persen', 'percentage', 10, 10000, 20000, 100, 1, now() + interval '30 days');
```
