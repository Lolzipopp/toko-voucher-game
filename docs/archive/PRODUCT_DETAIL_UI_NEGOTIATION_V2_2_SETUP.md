# RIKU STORE — Product Detail UI & Negotiation V2.2

## Perubahan
- Label `Akun unik` di kartu dan detail produk dihapus.
- Gambar kartu dan detail memakai rasio 2:1 serta `contain`, sehingga foto 1600×800 terlihat penuh dan tidak terpotong.
- Teks catatan penggantian jumlah keranjang dihapus.
- `Digital` diganti menjadi `Pengiriman instan`.
- Tombol favorit, salin link, dan WhatsApp dibuat solid dan terbaca pada latar putih.
- Kotak nego dibuat solid dengan kontras yang jelas.
- Semua produk unik otomatis bisa dinego; produk massal otomatis tidak bisa dinego.

## Migration
Jalankan:

`supabase/migrations/20260613000033_unique_products_negotiable_v1.sql`

## Perintah tes

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- -p 3001
```
