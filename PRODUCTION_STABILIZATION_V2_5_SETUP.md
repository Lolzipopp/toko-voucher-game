# RIKU STORE — Production Stabilization V2.5

Batch ini aman dipasang setelah launch karena tidak mengubah schema database dan tidak menyentuh alur checkout, stok, payment, atau credential.

## Perubahan

- Tool import Telegram ditolak otomatis di production walaupun env salah aktif.
- Halaman error global, error halaman, dan 404 yang lebih ramah pembeli.
- Security headers tambahan termasuk HSTS di production.
- GitHub Actions untuk lint, typecheck, dan build setiap push/PR.
- Script `npm run typecheck`.
- README production dan SECURITY policy.
- Dokumen setup lama dipindahkan ke `docs/archive/`.

## Migration

Tidak ada migration baru.

## Perintah validasi

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## Production

Pastikan `ENABLE_INTERNAL_TEST_TOOLS=false` di Vercel Production.
