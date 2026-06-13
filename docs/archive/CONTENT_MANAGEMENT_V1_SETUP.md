# RIKU STORE — Content Management V1

## Tiga fitur
1. Banner pengumuman homepage
2. Testimoni asli yang disetujui admin
3. FAQ yang dapat dikelola dari admin

## Instalasi
1. Copy/replace seluruh isi paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260611000027_content_management_v1.sql`
3. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Penggunaan
Buka:
`/admin/content`

Dari sana admin dapat:
- membuat dan menjadwalkan pengumuman,
- mengaktifkan/nonaktifkan pengumuman,
- menambah testimoni asli,
- menyetujui atau menyembunyikan testimoni,
- memilih testimoni unggulan,
- menambah, menonaktifkan, atau menghapus FAQ.

## Catatan
- Jangan memasukkan testimoni palsu.
- Link tombol pengumuman dibatasi ke URL internal yang diawali `/`.
- Hanya testimoni berstatus approved yang tampil publik.
