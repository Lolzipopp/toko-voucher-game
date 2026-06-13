import type { Metadata } from "next";

import LegalPage from "@/components/store/legal-page";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — RIKU STORE",
  description:
    "Ketentuan pembelian produk digital, pembayaran, pengiriman, akun pembeli, dan penggunaan layanan RIKU STORE.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Dokumen Legal"
      title="Syarat & Ketentuan"
      description="Ketentuan ini mengatur penggunaan website, pembelian produk digital, pembayaran, pengiriman akses akun, garansi, dan bantuan pelanggan."
      updatedAt="11 Juni 2026"
    >
      <section>
        <h2>1. Ruang lingkup</h2>
        <p>
          Website ini dioperasikan oleh RIKU STORE untuk
          menawarkan produk digital berupa akses akun game.
          Dengan memakai website, membuat akun pembeli, atau
          menyelesaikan checkout, pembeli dianggap telah membaca
          dan menyetujui ketentuan ini.
        </p>
      </section>

      <section>
        <h2>2. Informasi produk</h2>
        <p>
          Nama produk, spesifikasi, atribut, harga, promo,
          ketersediaan, dan masa garansi ditampilkan pada halaman
          produk atau checkout. Pembeli wajib memeriksa kecocokan
          produk sebelum membayar.
        </p>
        <p>
          Informasi bonus yang dinyatakan tidak pasti, acak, atau
          bergantung keberuntungan bukan bagian spesifikasi utama
          yang dijamin.
        </p>
      </section>

      <section>
        <h2>3. Harga dan biaya</h2>
        <p>
          Seluruh harga ditampilkan dalam rupiah. Sebelum
          pembayaran, pembeli akan melihat harga produk, diskon,
          biaya transaksi jika ada, dan total akhir.
        </p>
        <p>
          Harga yang berlaku adalah harga yang dihitung sistem
          pada saat pesanan dibuat. Perubahan harga setelah
          checkout tidak mengubah pesanan yang sudah dibayar.
        </p>
      </section>

      <section>
        <h2>4. Batas waktu pembayaran</h2>
        <p>
          Setelah pesanan dibuat, pembeli wajib menyelesaikan
          pembayaran dalam batas waktu yang tampil pada halaman
          pesanan. Jika waktu habis, pesanan dapat dibatalkan
          otomatis dan pembeli perlu membuat pesanan baru.
        </p>
      </section>

      <section>
        <h2>5. Pengiriman produk digital</h2>
        <p>
          Produk dikirim secara digital setelah pembayaran
          berhasil diverifikasi. Akses akun dapat diberikan
          melalui halaman pesanan pembeli dan pemberitahuan email.
        </p>
        <p>
          Pembeli bertanggung jawab menjaga kerahasiaan link
          pesanan, kode masuk email, username, password, dan data
          pemulihan akun.
        </p>
      </section>

      <section>
        <h2>6. Kewajiban pembeli</h2>
        <ul>
          <li>Menggunakan email aktif dan benar saat checkout.</li>
          <li>Tidak membagikan data akses kepada pihak lain.</li>
          <li>Mengganti password sesuai petunjuk setelah menerima akun.</li>
          <li>Tidak memakai cheat, exploit, atau aktivitas terlarang.</li>
          <li>Menyimpan bukti pembayaran dan nomor order.</li>
        </ul>
      </section>

      <section>
        <h2>7. Risiko platform game</h2>
        <p>
          Produk digital terkait tunduk pada kebijakan platform
          atau pengembang game masing-masing. RIKU STORE tidak
          berafiliasi dengan Roblox Corporation maupun pengembang
          game terkait.
        </p>
        <p>
          Pembeli memahami bahwa tindakan setelah penyerahan
          akun, termasuk perubahan data, penggunaan cheat,
          pelanggaran aturan platform, atau berbagi akses, dapat
          memengaruhi keamanan akun dan kelayakan garansi.
        </p>
      </section>

      <section>
        <h2>8. Garansi dan refund</h2>
        <p>
          Garansi dan refund mengikuti halaman Kebijakan Refund &
          Garansi. Pengajuan wajib disertai nomor order, penjelasan
          masalah, dan bukti yang relevan.
        </p>
      </section>

      <section>
        <h2>9. Penangguhan layanan</h2>
        <p>
          RIKU STORE dapat menolak, menunda, atau membatalkan
          transaksi yang terindikasi penipuan, penyalahgunaan
          promo, percobaan mengunci stok, pembayaran tidak sah,
          atau pelanggaran ketentuan.
        </p>
      </section>

      <section>
        <h2>10. Perubahan ketentuan</h2>
        <p>
          Ketentuan dapat diperbarui untuk menyesuaikan layanan,
          keamanan, metode pembayaran, dan ketentuan hukum.
          Versi terbaru berlaku sejak tanggal pembaruan yang
          tercantum pada halaman ini.
        </p>
      </section>
    </LegalPage>
  );
}
