# RIKU STORE — Gaming Homepage V1

## Perubahan
- Landing page dark navy + neon emerald.
- Header, hero, kartu layanan, katalog, kartu produk, FAQ, kesiapan pembayaran, dan footer dibuat konsisten.
- Hanya fitur yang benar-benar tersedia yang dapat diklik.
- Top Up ditampilkan sebagai Segera Hadir.
- Testimoni palsu, Discord, Telegram, dan metode pembayaran yang belum aktif tidak ditampilkan.
- Midtrans ditulis Segera Hadir sampai integrasi selesai.

## Instalasi
1. Copy/replace seluruh paket ke project terbaru.
2. Tidak ada migration SQL baru.
3. Jangan hapus `.env.local` dan `.git`.
4. Jalankan:
   - `npm.cmd install`
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - `npm.cmd run dev -- -p 3001`

## Catatan
- Isi email, WhatsApp, nama toko, dan tagline tetap diambil dari `/admin/settings`.
- Produk dan jumlah stok tetap diambil dari Supabase.
- Upload gambar produk di admin agar kartu katalog tidak memakai ikon placeholder.
