# RIKU STORE — Payment Infrastructure V1

## Tiga fitur
1. Pusat Pembayaran Admin di `/admin/finance`
2. Webhook Event Inbox + idempotency ledger
3. Refund Workflow V1 di `/admin/finance/refunds`

## Instalasi
1. Copy/replace seluruh paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260610000023_payment_infrastructure_v1.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Catatan penting
- Refund belum mengirim uang otomatis.
- Status `approved` berarti refund disetujui untuk diproses.
- Webhook inbox masih kosong sampai Midtrans atau provider lain terhubung.
- Adapter provider sudah disiapkan di `src/lib/payments`.
