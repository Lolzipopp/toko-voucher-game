# Production Error Monitoring V3.6

- Tool Telegram mengembalikan 404 di production dan tetap hanya bisa digunakan lokal.
- Error browser dari `error.tsx` dan `global-error.tsx` dicatat secara aman.
- Admin dapat melihat error terbaru di `/admin/health` dan menandainya selesai.
- Payload dibatasi panjangnya dan tidak mengirim password, token, atau credential.

## Migration
Jalankan `20260613000038_app_error_monitoring_v1.sql`.
