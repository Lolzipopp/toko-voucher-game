# Quantity & Cart Fix V1

Fitur:
1. Pemilih jumlah 1/2/3 dst di detail produk.
2. Jumlah maksimum mengikuti stok nyata; produk unik maksimal 1.
3. Beli Sekarang dan + Keranjang mengganti jumlah produk yang sama, tidak menambah diam-diam.

Instalasi:
1. Copy/replace isi ZIP ke project terbaru.
2. Tidak ada migration SQL baru.
3. Jalankan npm.cmd install, npm.cmd run build, npm.cmd run dev -- -p 3001.

Tes:
- Pilih 2 lalu Beli Sekarang: checkout harus berisi 2, bukan 3 atau jumlah lama.
- Kembali pilih 1 lalu + Keranjang: jumlah produk harus menjadi 1.
- Tombol + tidak bisa melewati stok.
