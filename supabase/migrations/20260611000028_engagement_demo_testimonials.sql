-- =============================================================================
-- RIKU STORE — Engagement V1
-- Demo testimonial drafts only. They are NOT public until manually approved.
-- =============================================================================

BEGIN;

INSERT INTO public.customer_testimonials (
  customer_name,
  customer_role,
  content,
  rating,
  product_label,
  is_approved,
  is_featured,
  sort_order
)
SELECT *
FROM (
  VALUES
    (
      'Demo Pembeli 01',
      'KONTEN DEMO — jangan dipublikasikan',
      'Contoh testimoni: proses pembelian mudah dan produk sesuai deskripsi.',
      5,
      'Akun Roblox',
      FALSE,
      FALSE,
      901
    ),
    (
      'Demo Pembeli 02',
      'KONTEN DEMO — jangan dipublikasikan',
      'Contoh testimoni: admin cepat merespons pertanyaan sebelum checkout.',
      5,
      'Customer Service',
      FALSE,
      FALSE,
      902
    ),
    (
      'Demo Pembeli 03',
      'KONTEN DEMO — jangan dipublikasikan',
      'Contoh testimoni: halaman pesanan jelas dan data akun mudah diakses.',
      5,
      'Pesanan Digital',
      FALSE,
      FALSE,
      903
    ),
    (
      'Demo Pembeli 04',
      'KONTEN DEMO — jangan dipublikasikan',
      'Contoh testimoni: promo berhasil digunakan dan total harga transparan.',
      4,
      'Promo',
      FALSE,
      FALSE,
      904
    ),
    (
      'Demo Pembeli 05',
      'KONTEN DEMO — jangan dipublikasikan',
      'Contoh testimoni: spesifikasi akun sama seperti yang tertulis di website.',
      5,
      'Blox Fruits',
      FALSE,
      FALSE,
      905
    ),
    (
      'Demo Pembeli 06',
      'KONTEN DEMO — jangan dipublikasikan',
      'Contoh testimoni: tampilan toko nyaman dipakai dari HP.',
      5,
      'Website',
      FALSE,
      FALSE,
      906
    )
) AS demo(
  customer_name,
  customer_role,
  content,
  rating,
  product_label,
  is_approved,
  is_featured,
  sort_order
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.customer_testimonials
  WHERE customer_role = 'KONTEN DEMO — jangan dipublikasikan'
);

COMMIT;
