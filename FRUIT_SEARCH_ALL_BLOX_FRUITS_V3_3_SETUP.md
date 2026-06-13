# RIKU STORE — Fruit Search All Blox Fruits V3.3

## Perubahan

Pencarian fruit sekarang berlaku generik untuk semua nama fruit Blox Fruits, bukan hanya Dough.

- Permanent/Owned fruit: tampil.
- Fruit yang sedang equip/digunakan: tampil.
- Fruit yang hanya muncul pada Awakening/Full Awk: tidak tampil.
- Berlaku baik saat mencari `fruit dough` maupun hanya `dough`.
- Tidak memakai daftar nama fruit hardcoded, sehingga fruit baru juga mengikuti aturan yang sama selama spesifikasinya memakai label yang benar.

## Migration

Tidak ada migration baru.

## Pemeriksaan

Jalankan:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run check:production
npm.cmd run build
```
