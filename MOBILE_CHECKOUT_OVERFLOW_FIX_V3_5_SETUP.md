# RIKU STORE Mobile Checkout Overflow Fix V3.5

## Perubahan
- Mencegah horizontal overflow pada halaman checkout mobile.
- Header, main, checkout card, promo box, dan ringkasan pembayaran dipaksa mengikuti lebar viewport.
- Menambahkan `min-w-0`, `max-w-full`, dan `overflow-x-clip` pada container rawan melebar.
- Menambahkan perlindungan global agar media tidak melebihi viewport.

## Migration
Tidak ada migration baru.

## Tes
- Buka checkout di HP/iPhone.
- Pastikan tidak ada area putih di kanan.
- Pastikan header dan kartu checkout memenuhi lebar layar tanpa bisa digeser horizontal.
