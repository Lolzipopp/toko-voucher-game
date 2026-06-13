# RIKU STORE — Legal & Midtrans Readiness V1

## Fitur
1. Syarat & Ketentuan
2. Kebijakan Privasi
3. Kebijakan Refund & Garansi
4. Tentang & Kontak
5. Footer legal di halaman publik
6. Sitemap dan robots
7. Perbaikan OTP 6–10 digit ikut disertakan

## Instalasi
1. Copy/replace seluruh isi paket ke project terbaru.
2. Tidak ada migration SQL baru.
3. Buka `/admin/settings` dan pastikan:
   - Nama toko benar
   - Email bantuan terisi
   - Nomor WhatsApp terisi
   - Batas pembayaran benar
   - Garansi default benar
4. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Halaman publik
- `/syarat-ketentuan`
- `/kebijakan-privasi`
- `/refund-garansi`
- `/tentang-kontak`

## Sebelum verifikasi Midtrans
- Pastikan produk, harga rupiah, stok, checkout, kontak, dan halaman legal bisa dibuka.
- Jangan tampilkan fitur dummy atau simulasi pembayaran di produksi.
- Pastikan informasi bisnis yang diberikan ke Midtrans sesuai isi website.
- Tinjau kembali teks legal agar sesuai kebijakan bisnis yang benar-benar dijalankan.
