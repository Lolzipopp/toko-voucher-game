# RIKU STORE Production Tests V2.9

Batch ini menambahkan automated tests untuk alur keranjang dan error database tanpa mengubah database atau alur transaksi production.

## Perubahan

- Logika keranjang dipindahkan ke `src/lib/cart/operations.ts` agar dapat diuji terpisah.
- Test memastikan **Beli sekarang** mengganti isi checkout dan tidak mencampur keranjang lama.
- Test memastikan produk unik maksimal satu unit.
- Test memastikan produk massal tidak melebihi stok.
- Test memastikan data localStorage rusak dibuang.
- Test memastikan error database mentah tidak tampil ke pengguna.
- GitHub Actions sekarang menjalankan `npm run test`.
- Ditambahkan command lengkap `npm run check`.

## Command

```powershell
npm.cmd ci
npm.cmd run check
```

## Migration

Tidak ada migration baru.
