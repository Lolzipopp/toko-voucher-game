# RIKU STORE — Negotiation & Review V1

## Perubahan
1. Fitur Bandingkan dihapus sepenuhnya.
2. Fitur nego per produk ditambahkan.
3. Warning VS Code `Unknown at rule @theme` disembunyikan dengan setting editor.
4. Review code/security disertakan di `CODE_SECURITY_REVIEW_V1.md`.

## Instalasi
1. Copy/replace paket ke project terbaru.
2. Jalankan:
   `supabase/migrations/20260611000030_negotiation_v1.sql`
3. Jalankan:
   `cmd /c rmdir /s /q .next`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Mengaktifkan nego
1. Admin → Produk → Edit.
2. Centang `Izinkan pembeli mengajukan nego`.
3. Isi batas minimum penawaran jika diperlukan.
4. Simpan.
5. Buka detail produk dan tes tombol WhatsApp.

## Aturan penting
- Nego tidak otomatis mengubah harga checkout.
- Setelah sepakat, admin harus membuat promo khusus atau mengubah harga sebelum pembeli checkout.
- Jangan meminta pembeli checkout dengan harga lama lalu menjanjikan pengembalian selisih tanpa pencatatan.
