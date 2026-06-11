import type { Metadata } from "next";

import LegalPage from "@/components/store/legal-page";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — RIKU STORE",
  description:
    "Penjelasan pengumpulan, penggunaan, penyimpanan, dan perlindungan data pembeli RIKU STORE.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Perlindungan Data"
      title="Kebijakan Privasi"
      description="Kebijakan ini menjelaskan data apa yang diproses, mengapa data dibutuhkan, dengan siapa data dapat dibagikan, serta pilihan yang dimiliki pengguna."
      updatedAt="11 Juni 2026"
    >
      <section>
        <h2>1. Data yang dikumpulkan</h2>
        <ul>
          <li>Alamat email pembeli.</li>
          <li>Nomor order dan data transaksi.</li>
          <li>Produk, jumlah, harga, promo, dan status pembayaran.</li>
          <li>Data teknis dasar untuk keamanan dan pembatasan penyalahgunaan.</li>
          <li>Pesan bantuan, bukti masalah, dan catatan refund bila diajukan.</li>
        </ul>
      </section>

      <section>
        <h2>2. Tujuan penggunaan data</h2>
        <ul>
          <li>Membuat dan memproses pesanan.</li>
          <li>Memverifikasi pembayaran dan mengirim produk digital.</li>
          <li>Menyediakan login akun pembeli melalui email.</li>
          <li>Memberikan garansi, refund, dan bantuan pelanggan.</li>
          <li>Mencegah spam, penipuan, penyalahgunaan promo, dan akses tidak sah.</li>
          <li>Memenuhi kewajiban administrasi dan hukum yang berlaku.</li>
        </ul>
      </section>

      <section>
        <h2>3. Dasar pemrosesan</h2>
        <p>
          Data diproses untuk menjalankan transaksi yang diminta
          pembeli, menjaga keamanan layanan, memenuhi kewajiban
          hukum, serta berdasarkan persetujuan ketika diperlukan.
        </p>
      </section>

      <section>
        <h2>4. Penyedia layanan</h2>
        <p>
          Untuk menjalankan website, data dapat diproses oleh
          penyedia infrastruktur, database, autentikasi, email,
          hosting, dan payment gateway. Penyedia hanya menerima
          data yang diperlukan untuk menjalankan fungsinya.
        </p>
        <p>
          RIKU STORE tidak menjual data pribadi pembeli kepada
          pengiklan.
        </p>
      </section>

      <section>
        <h2>5. Penyimpanan dan keamanan</h2>
        <p>
          Data disimpan selama dibutuhkan untuk transaksi,
          garansi, penyelesaian sengketa, keamanan, dan kewajiban
          administrasi. Data akses produk digital disimpan dalam
          bentuk terenkripsi dan hanya dibuka melalui alur yang
          telah diverifikasi.
        </p>
        <p>
          Tidak ada sistem yang sepenuhnya bebas risiko. Karena
          itu pembeli juga wajib menjaga keamanan email, kode
          masuk, perangkat, dan link pesanan.
        </p>
      </section>

      <section>
        <h2>6. Cookie dan penyimpanan browser</h2>
        <p>
          Website dapat memakai cookie yang diperlukan untuk
          login, keamanan sesi, dan fungsi keranjang. Data
          keranjang dapat disimpan di browser agar isi keranjang
          tidak hilang saat halaman ditutup.
        </p>
      </section>

      <section>
        <h2>7. Hak pengguna</h2>
        <p>
          Pengguna dapat meminta akses, koreksi, atau penghapusan
          data tertentu melalui kontak bantuan. Permintaan dapat
          ditolak atau dibatasi apabila data masih dibutuhkan
          untuk transaksi, keamanan, sengketa, atau kewajiban
          hukum.
        </p>
      </section>

      <section>
        <h2>8. Anak dan penggunaan email</h2>
        <p>
          Pembeli yang belum memenuhi usia yang dipersyaratkan
          untuk melakukan transaksi mandiri harus memperoleh izin
          orang tua atau wali. Pengguna wajib memakai email yang
          berada dalam kendalinya sendiri.
        </p>
      </section>

      <section>
        <h2>9. Perubahan kebijakan</h2>
        <p>
          Kebijakan dapat diperbarui seiring perubahan fitur,
          penyedia layanan, keamanan, atau ketentuan hukum.
          Tanggal versi terbaru dicantumkan pada bagian atas.
        </p>
      </section>
    </LegalPage>
  );
}
