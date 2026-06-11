# RIKU STORE V1.5 — Banner & Product Image Slider

## Perubahan
- Banner homepage sekarang mendukung drag mouse, swipe HP, tombol panah, indikator titik, dan autoplay 5 detik.
- Setelah pengguna berpindah manual, autoplay berhenti sementara 8 detik agar banner tidak langsung meloncat.
- Foto detail produk sekarang menjadi slider untuk semua gambar produk.
- Area foto produk memakai rasio 2:1 (1600×800).
- Petunjuk upload gambar produk di admin diubah menjadi 1600×800 px.

## Migration
Tidak ada migration baru.

## Test
1. Upload minimal 2 banner aktif.
2. Geser dengan mouse dan HP.
3. Tekan panah dan titik.
4. Upload minimal 2 gambar pada satu produk.
5. Buka detail produk dan tes swipe, panah, dan titik.
6. Jalankan npm.cmd run lint dan npm.cmd run build.
