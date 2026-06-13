# RIKU STORE — Mobile Checkout, Banner & Needs Layout V2.4

## Perubahan
- Tombol **Beli sekarang** mengganti isi checkout dengan produk yang baru dipilih. Isi keranjang lama tidak ikut ke checkout instan.
- Tombol **+ Keranjang** tetap mempertahankan perilaku keranjang biasa.
- Seluruh area banner dapat ditekan selama banner memiliki tujuan tautan.
- Banner fallback **Hubungi admin** langsung membuka WhatsApp.
- Banner admin dengan label tombol "Hubungi admin" juga diarahkan ke WhatsApp aktif toko.
- Bagian **Pilih kebutuhanmu** tampil sebagai 4 kartu ringkas dalam satu baris di HP; detail lengkap tetap tampil pada tablet/desktop.

## Migration
Tidak ada migration baru.

## File utama
- `src/components/store/cart-provider.tsx`
- `src/components/store/add-to-cart-button.tsx`
- `src/components/store/home-banner-carousel.tsx`
- `src/app/page.tsx`

## Tes
1. Isi keranjang dengan produk A.
2. Buka produk B lalu tekan Beli sekarang.
3. Checkout harus hanya berisi produk B.
4. Kembali, tambahkan A dan B menggunakan + Keranjang; keranjang biasa harus memuat keduanya.
5. Tekan area banner, tombol CTA, panah, titik, dan swipe.
6. Banner Hubungi admin harus membuka WhatsApp.
7. Cek bagian Pilih kebutuhanmu pada layar HP: empat kartu harus sejajar satu baris.
