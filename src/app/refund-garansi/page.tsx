import type { Metadata } from "next";

import LegalPage from "@/components/store/legal-page";
import { getPublicStoreSettings } from "@/lib/public-store/settings";

export const metadata: Metadata = {
  title: "Refund & Garansi — RIKU STORE",
  description:
    "Ketentuan garansi akun game, penggantian produk, pembatalan, dan refund di RIKU STORE.",
};

export default async function RefundWarrantyPage() {
  const settings = await getPublicStoreSettings();

  return (
    <LegalPage
      eyebrow="Perlindungan Pembeli"
      title="Kebijakan Refund & Garansi"
      description="Kebijakan ini menjelaskan masalah yang ditanggung, bukti yang diperlukan, kondisi yang tidak ditanggung, dan proses penyelesaian keluhan."
      updatedAt="11 Juni 2026"
    >
      <section>
        <h2>1. Masa garansi</h2>
        <p>
          Masa garansi default adalah{" "}
          <strong>{settings.default_warranty_days} hari</strong>{" "}
          sejak produk dinyatakan terkirim, kecuali halaman produk
          menyebutkan masa yang berbeda.
        </p>
      </section>

      <section>
        <h2>2. Masalah yang dapat diajukan</h2>
        <ul>
          <li>Data login tidak dapat digunakan sejak pertama diterima.</li>
          <li>Spesifikasi utama berbeda dari informasi produk.</li>
          <li>Akun bermasalah sebelum pembeli melakukan perubahan atau pelanggaran.</li>
          <li>Produk tidak terkirim meskipun pembayaran sudah terverifikasi.</li>
          <li>Pembayaran ganda yang terbukti untuk pesanan yang sama.</li>
        </ul>
      </section>

      <section>
        <h2>3. Penyelesaian yang tersedia</h2>
        <p>
          Setelah pemeriksaan, penyelesaian dapat berupa bantuan
          pemulihan, penggantian akun dengan spesifikasi setara,
          kredit toko, refund sebagian, atau refund penuh.
          Bentuk penyelesaian ditentukan berdasarkan jenis masalah
          dan bukti yang tersedia.
        </p>
      </section>

      <section>
        <h2>4. Kondisi yang tidak ditanggung</h2>
        <ul>
          <li>Pembeli salah memilih produk atau berubah pikiran setelah data akun dibuka.</li>
          <li>Akun dibagikan, dijual ulang, atau dipinjamkan kepada pihak lain.</li>
          <li>Password, email, atau data keamanan diubah tanpa mengikuti petunjuk.</li>
          <li>Penggunaan cheat, exploit, script, bot, atau aktivitas terlarang.</li>
          <li>Sanksi akibat tindakan pembeli atau pelanggaran kebijakan platform.</li>
          <li>Bonus tidak pasti yang tidak termasuk spesifikasi utama.</li>
          <li>Keluhan diajukan setelah masa garansi berakhir tanpa alasan yang dapat diverifikasi.</li>
        </ul>
      </section>

      <section>
        <h2>5. Bukti yang diperlukan</h2>
        <ul>
          <li>Nomor order dan email pembeli.</li>
          <li>Penjelasan masalah secara kronologis.</li>
          <li>Screenshot atau rekaman layar yang jelas.</li>
          <li>Bukti bahwa masalah terjadi sebelum perubahan oleh pembeli, bila relevan.</li>
        </ul>
        <p>
          Untuk menjaga keadilan, toko dapat meminta bukti tambahan
          sebelum menyetujui penggantian atau refund.
        </p>
      </section>

      <section>
        <h2>6. Pembatalan pesanan</h2>
        <p>
          Pesanan yang belum dibayar dapat kedaluwarsa dan
          dibatalkan otomatis. Setelah pembayaran berhasil dan
          akses akun sudah diberikan, pembatalan sepihak karena
          berubah pikiran tidak otomatis memenuhi syarat refund.
        </p>
      </section>

      <section>
        <h2>7. Waktu penanganan</h2>
        <p>
          Permintaan akan diperiksa sesegera mungkin setelah bukti
          lengkap diterima. Waktu masuknya dana refund dapat
          bergantung pada metode pembayaran, bank, dompet digital,
          dan kebijakan payment gateway.
        </p>
      </section>

      <section>
        <h2>8. Cara mengajukan</h2>
        <p>
          Hubungi kontak bantuan pada website, sertakan nomor
          order, email pembeli, bukti pembayaran, dan bukti
          masalah. Jangan mengirim password melalui kanal publik.
        </p>
      </section>
    </LegalPage>
  );
}
