# RIKU STORE — Customer Account + Email OTP V1

## Fitur
1. Login/daftar pembeli dengan kode OTP 6 digit lewat email.
2. Akun pembeli otomatis dibuat tanpa password.
3. Semua order lama dengan email yang sama otomatis masuk ke `/akun`.
4. `/cek-pesanan` sekarang meminta verifikasi email terlebih dahulu.
5. Tombol Pengaturan ditambahkan ke sidebar admin.
6. Di mobile, Pengaturan tersedia lewat tombol gear di header admin.

## Instalasi
1. Copy/replace seluruh isi paket ke project terbaru.
2. Jalankan migration:
   `supabase/migrations/20260610000026_customer_account_email_otp.sql`
3. Di Supabase Dashboard buka:
   Authentication → Email Templates → Magic Link
4. Pastikan isi email menampilkan token:
   `{{ .Token }}`
   Bukan hanya link konfirmasi.
5. Jalankan:
   `npm.cmd install`
   `npm.cmd run lint`
   `npm.cmd run build`
   `npm.cmd run dev -- -p 3001`

## Tes
1. Buka `/akun`.
2. Masukkan email yang pernah dipakai checkout.
3. Masukkan kode 6 digit dari email.
4. Pastikan order lama otomatis muncul.
5. Buka admin dan pastikan tombol Pengaturan muncul.
