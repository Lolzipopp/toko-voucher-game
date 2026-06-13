# RIKU STORE

Website toko digital akun game milik owner sendiri. Fokus saat ini adalah penjualan akun Roblox melalui checkout manual WhatsApp, reservasi stok FIFO, dan pengiriman credential setelah pembayaran dikonfirmasi admin.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Supabase PostgreSQL, Auth, Storage, RLS, dan RPC
- Vercel
- Resend melalui Supabase Custom SMTP

## Menjalankan secara lokal

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev -- -p 3001
```

Buat `.env.local` sendiri. Jangan pernah commit secret, service-role key, encryption key, atau credential stok.

## Pemeriksaan sebelum deploy

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `ENABLE_INTERNAL_TEST_TOOLS=false`
- Test checkout manual, reservasi expired, dan stok terakhir

## Tool import Telegram

Tool import bersifat lokal dan otomatis ditolak di production. Data import berada di `private-import/` dan tidak boleh masuk Git.

## Dokumentasi lama

Catatan setup versi terdahulu dipindahkan ke `docs/archive/` agar root repository tetap ringkas.
