# RIKU STORE — Production UX & Catalog Fix V3.2

## Perubahan

- Keranjang dikosongkan setelah checkout berhasil membuat order.
- Foto produk habis diberi efek abu-abu agar mudah dibedakan.
- Pencarian `fruit <nama>` hanya mencocokkan permanent fruit atau fruit yang sedang dipakai, bukan awakening-only.
- Teks `ALL ON, -SANGUINE` ditampilkan sebagai `Semua Fighting Style aktif, kecuali Sanguine`.
- Bagian testimoni dipastikan berada sebelum FAQ dan hanya memakai testimoni approved.
- Tombol OTP memiliki status mengirim dan jeda 30 detik sebelum kirim ulang.
- Pesan keamanan halaman order dibuat lebih ramah pembeli.
- Footer mobile dibuat lebih pendek dan tersusun dua kolom.

## Migration

Jalankan:

`supabase/migrations/20260613000036_catalog_search_and_copy_cleanup_v1.sql`

Migration hanya memperbaiki teks spesifikasi Fighting Style. Tidak mengubah stok, credential, order, atau pembayaran.

## Pemeriksaan

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run check:production
npm.cmd run build
```

Lint, typecheck, 17 test, dan production safety check sudah berhasil di paket ini. Kompilasi dan TypeScript pada `next build` juga berhasil; proses pengumpulan page data di lingkungan pembuatan paket terhenti karena batas waktu proses container, sehingga build final tetap perlu dijalankan di komputer/Vercel.
