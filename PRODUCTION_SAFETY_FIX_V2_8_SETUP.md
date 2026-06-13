# RIKU STORE Production Safety Fix V2.8

Perubahan:
- Menghapus `encType` manual dari form banner yang memakai Server Action.
- Memastikan script `typecheck` tersedia.
- Menambahkan `npm run check:production`.
- CI memeriksa folder project duplikat, route Bandingkan, dan form Server Action yang masih memakai `method`/`encType` manual.
- ZIP disusun dengan isi project langsung di root agar tidak membuat folder `work_stabilize` baru.

Tidak ada migration baru.
