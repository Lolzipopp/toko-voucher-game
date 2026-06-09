# RIKU STORE Admin UI V2

## Wajib dijalankan satu kali
Jalankan migration berikut di Supabase SQL Editor:

`supabase/migrations/20260609000012_restore_product.sql`

Migration menambahkan fungsi `admin_restore_product()` untuk memulihkan produk arsip menjadi `draft`.

## Menjalankan project
1. Salin kembali `.env.local` milikmu (file ini sengaja tidak disertakan).
2. `npm install`
3. `npm run build`
4. `npm run dev`

## Perubahan utama
- Sidebar desktop dan bottom navigation mobile.
- Dashboard statistik baru.
- Tampilan produk aktif dan arsip dipisah.
- Produk arsip dapat dipulihkan ke status draft.
- UI stok dan login diperbarui.
