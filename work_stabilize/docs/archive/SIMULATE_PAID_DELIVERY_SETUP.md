# Simulasi Paid + Auto-Delivery V1

1. Copy/replace paket ini ke project RIKU STORE.
2. Jalankan migration:
   `supabase/migrations/20260609000014_simulate_test_paid_delivery.sql`
3. Jalankan `npm.cmd run build`.
4. Buka order dummy yang reservasinya belum expired.
5. Klik **Simulasikan Paid & Delivery**.
6. Pastikan:
   - payment_status = paid
   - delivery_status = delivered
   - inventory = sold
   - warranty_ends_at terisi
7. Klik tombol yang sama sekali lagi. Jumlah stok terhubung harus tetap sama.
