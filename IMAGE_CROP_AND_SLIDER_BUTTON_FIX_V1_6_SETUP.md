# RIKU STORE V1.6 — Slider Button & Image Crop

## Perubahan
- Tombol panah dan titik pada banner homepage dapat diklik tanpa tertangkap gesture drag parent.
- Tombol panah dan titik pada slider gambar produk dapat diklik.
- Upload banner admin memiliki crop editor rasio 2:1.
- Upload gambar produk admin memiliki crop editor rasio 2:1.
- Hasil crop otomatis 1600×800 WebP sebelum dikirim ke server.

## Migration
Tidak ada migration baru. Migration terakhir tetap 20260611000031_homepage_banner_carousel_v1.sql.

## Test
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- -p 3001
