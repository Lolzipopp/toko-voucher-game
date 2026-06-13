# RIKU STORE — Code & Security Review

Review target: Manual Sales Launch V1 + Negotiation V1.

## Ringkasan nilai

- Code cleanliness: 6.5/10
- Security foundation: 7.5/10
- Duplication: 6/10
- Scalability for current small store: 8/10
- Scalability for large traffic: 5.5/10
- Hardcoded configuration: 7/10
- Error handling: 6.5/10
- Ready for manual sales after testing: yes
- Ready for unattended automatic payment: not yet

## Code clean

Yang sudah baik:
- Pemisahan route admin, public, database RPC, dan komponen cukup jelas.
- TypeScript digunakan pada halaman dan komponen utama.
- Kredensial stok tidak dipindahkan ke client.
- Fitur lokal seperti favorit/recently viewed memakai modul terpisah.
- Fitur payment provider sudah memiliki abstraction awal.

Yang perlu dibersihkan:
- Beberapa file masih sangat padat dan sulit dibaca, khususnya form dan server actions.
- Pengecekan admin masih memiliki versi yang berulang.
- Format uang/tanggal dan tipe settings masih dibuat ulang di beberapa file.
- Server action produk melakukan create/update inti, merchandising, lalu nego melalui RPC terpisah.
- Type database masih ditulis manual; sebaiknya generate type dari Supabase.

Prioritas refactor:
1. Gunakan satu `requireAdmin()` bersama.
2. Pusatkan formatter dan status labels.
3. Generate `database.types.ts`.
4. Gabungkan update produk menjadi satu transaction/RPC.
5. Pecah file action besar berdasarkan domain.

## Security

Yang sudah baik:
- Supabase service-role tidak digunakan di browser.
- Harga dan stok diverifikasi ulang di database.
- FIFO dan reservation mencegah double-selling.
- Konfirmasi pembayaran manual hanya tersedia untuk admin aktif.
- Pengiriman akun dijalankan di database dan bersifat idempotent.
- Kredensial disimpan terenkripsi.
- RLS dan SECURITY DEFINER memakai `search_path` eksplisit pada fungsi penting.
- Upload dibatasi tipe dan ukuran.

Risiko yang masih ada:
- Konfirmasi pembayaran manual bergantung pada pemeriksaan manusia. Salah klik dapat mengirim akun tanpa uang masuk.
- Pemeriksaan upload memakai MIME dari browser, belum memverifikasi signature binary file.
- Token akses order masih berada di URL.
- Belum ada monitoring realtime ketika delivery/email gagal.
- Login OTP dan endpoint publik tetap perlu diuji rate limit production.
- Negosiasi lewat WhatsApp tidak membuktikan identitas pembeli dan bukan kontrak harga otomatis.

Sebelum jual:
- Pastikan internal test tools false.
- Pastikan admin memakai password kuat dan MFA Supabase jika tersedia.
- Jangan membagikan URL credential.
- Tes RLS dengan user anon dan customer.
- Backup encryption key di tempat aman.

## Duplicated

Duplikasi yang terlihat:
- `PublicSettings` client didefinisikan di header dan footer.
- Formatter rupiah/tanggal ada di banyak komponen.
- Pesan WhatsApp dibuat di beberapa tempat.
- Admin guard memiliki lebih dari satu implementasi.
- Error mapping redirect masih tersebar.

Saran:
- `src/lib/config/public-settings.ts`
- `src/lib/format/currency.ts`
- `src/lib/whatsapp/messages.ts`
- satu helper `requireAdmin()`
- satu helper untuk error code database

## Scalable

Untuk kondisi awal:
- Cukup aman untuk katalog kecil sampai menengah.
- Favorit, riwayat, dan nego WhatsApp tidak membebani database.
- Stock reservation dilakukan di database.
- Gambar memakai Supabase Storage.
- Vercel dapat menskalakan frontend.

Batas saat data membesar:
- Beberapa halaman admin membatasi hasil tanpa cursor pagination.
- Dashboard masih dapat mengambil banyak row dan menghitung di aplikasi.
- Header/footer dapat melakukan fetch setting berulang pada navigasi client.
- Pengiriman email belum memakai queue/retry worker.
- Order list dan audit log perlu pagination.
- Statistik perlu aggregate SQL/view, bukan reduce seluruh row.

Untuk penjualan awal saat ini skalanya memadai.

## Hardcoded

Sudah dipusatkan:
- Nama toko, WhatsApp, email bantuan, waktu pembayaran, garansi, dan credential visibility berada di store settings.
- Mode pembayaran manual dapat diubah dari admin.
- Nego dapat diatur per produk.

Masih hardcoded:
- Nama default `RIKU STORE`.
- Fallback bucket `product-images`.
- Beberapa teks bisnis dan label UI.
- Batas upload 2 MB.
- Maksimum favorit/recently viewed.
- Daftar status di frontend.
- Tanggal pembaruan halaman legal.

Hardcoded UI tidak berbahaya, tetapi setting operasional sebaiknya tetap berada di database atau config tunggal.

## Error handling

Yang sudah baik:
- Mayoritas server action memberi pesan yang mudah dipahami.
- Checkout memiliki mapping error stock/rate limit.
- Manual delivery menangkap error dan menandai `delivery_failed`.
- Upload menghapus file Storage jika insert database gagal.
- Website memiliki fallback setting bila RPC gagal.

Yang perlu ditambah:
- Centralized logging seperti Sentry.
- Correlation ID untuk order, webhook, dan email.
- Retry untuk email gagal.
- Error page khusus 500 dan not-found dengan tombol bantuan.
- Jangan tampilkan `error.message` database mentah di beberapa admin action.
- Transaction tunggal untuk seluruh update produk.
- Alert admin ketika pembayaran sudah paid tetapi delivery gagal.

## Keputusan launch

Untuk menerima order manual:
- Layak setelah lint/build lolos.
- Wajib melakukan satu transaksi end-to-end sendiri.
- Wajib memastikan foto, stok, email, WhatsApp, legal, dan order delivery benar.
- Jangan menyalakan pembayaran otomatis sebelum Midtrans webhook selesai diuji.
