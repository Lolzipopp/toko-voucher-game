# RIKU STORE Mobile, Search, and Public Copy V2.3

## Perubahan
- Search publik kini menjadi filter ketat. Hanya produk yang nama, game, deskripsi, atau atributnya cocok dengan seluruh kata pencarian yang ditampilkan.
- Ringkasan hasil pencarian menampilkan jumlah hasil dan jumlah stok yang sesuai.
- Form search lebih nyaman di HP: input dan tombol tersusun vertikal pada layar kecil.
- Kartu kebutuhan, katalog, kartu produk, dan detail produk memiliki spacing, ukuran teks, tombol, dan radius yang lebih proporsional di layar HP.
- Menghapus kalimat mentah tentang admin mengaktifkan promo.
- Memperbaiki beberapa empty state dan teks publik agar mudah dipahami pembeli.

## File yang diubah
- src/app/page.tsx
- src/components/store/product-card.tsx
- src/components/store/product-search-form.tsx
- src/app/products/[slug]/page.tsx

## Migration
Tidak ada migration baru.

## Tes
1. Cari satu kata spesifik seperti `gas`, `ghoul v4`, atau `godhuman`.
2. Pastikan hanya produk yang mengandung semua kata tersebut yang tampil.
3. Reset pencarian dan pastikan seluruh produk kembali.
4. Tes homepage dan detail produk pada lebar 360px, 390px, dan 430px.
5. Pastikan tombol search, game filter, kartu produk, keranjang, dan nego mudah ditekan.

## Validasi
- npm run lint: berhasil
- npm run build: berhasil
