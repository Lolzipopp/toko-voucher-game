# Security Policy

Jangan membuat issue publik yang berisi credential, token order, API key, atau data pelanggan.

## Secret yang dilarang masuk repository

- `SUPABASE_SERVICE_ROLE_KEY`
- encryption/HMAC key inventory
- Resend/SMTP secret
- `CHECKOUT_RATE_LIMIT_SECRET`
- `.env.local`
- isi `private-import/`
- username/password akun game

## Production checklist

- `ENABLE_INTERNAL_TEST_TOOLS=false`
- RLS tetap aktif
- service-role hanya dipakai di server
- verifikasi pembayaran dilakukan server-side
- credential tidak dicatat ke log
- route order memakai `no-store` dan `noindex`

Jika secret pernah ter-commit, segera rotate secret tersebut. Menghapus file saja tidak membersihkan Git history.
