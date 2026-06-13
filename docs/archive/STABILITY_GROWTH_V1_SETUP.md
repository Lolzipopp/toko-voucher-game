# RIKU STORE — Stability & Growth V1

## Perbaikan error 400
Header dan footer tidak lagi memanggil RPC Supabase langsung dari browser.
Sekarang keduanya memanggil endpoint same-origin:
`/api/public/store-settings`

Jika RPC atau schema cache bermasalah, endpoint mengembalikan setting default tanpa menampilkan error 400 di console pembeli.

## Tiga fitur baru
1. Bandingkan maksimal 3 produk (`/bandingkan`)
2. Minta info restock via WhatsApp saat produk habis
3. Navigasi cepat mobile untuk Home, Favorit, Bandingkan, Keranjang, Akun

## Instalasi
Tidak ada migration SQL baru.

Jalankan:
`cmd /c rmdir /s /q .next`
`npm.cmd run lint`
`npm.cmd run build`
`npm.cmd run dev -- -p 3001`
