# RIKU STORE NEGOTIATION REVIEW V1.1

## File yang diubah
- `src/app/admin/promos/page.tsx`
  - Menangani lint React purity untuk waktu evaluasi promo yang hanya dihitung sekali per request server.
- `src/components/store/favorite-button.tsx`
  - Mengganti sinkronisasi state berbasis effect menjadi `useSyncExternalStore` agar favorit tetap sinkron tanpa cascading render.
- `src/app/products/[slug]/page.tsx`
  - Menyambungkan `NegotiationBox` ke halaman detail produk.
  - Mengambil nomor WhatsApp dan nama toko dari public store settings, dengan fallback environment variable.
  - Kotak nego hanya tampil bila `allow_negotiation = true`.

## Migration
Tidak ada migration baru. Migration terbaru tetap:
`supabase/migrations/20260611000030_negotiation_v1.sql`

## Hasil pemeriksaan
- `npm ci`: berhasil
- `npm run lint`: berhasil, 0 error, 0 warning
- `npm run build`: berhasil, TypeScript dan seluruh route selesai dibangun

## Perintah Windows PowerShell
```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- -p 3001
```

## Tes wajib
1. Edit satu produk dan aktifkan nego.
2. Isi minimum penawaran di bawah harga produk.
3. Buka detail produk dan pastikan kotak nego tampil.
4. Coba nominal di bawah minimum; harus ditolak.
5. Coba nominal sama/lebih tinggi dari harga; harus ditolak.
6. Coba nominal valid; tombol WhatsApp harus membawa nama produk, harga, penawaran, catatan, dan link.
7. Nonaktifkan nego; kotak nego harus hilang.
8. Tambah/hapus favorit dan pastikan status sinkron pada kartu/detail/favorit.
9. Buka admin promo; promo kedaluwarsa tidak memiliki tombol aktif/nonaktif.
