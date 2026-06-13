-- =============================================================================
-- RIKU STORE — Content Management V1
-- Homepage announcements, approved testimonials, and editable FAQs.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.site_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  button_label TEXT,
  button_url TEXT,
  tone TEXT NOT NULL DEFAULT 'promo'
    CHECK (tone IN ('promo', 'info', 'warning')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_announcements_active_idx
ON public.site_announcements(is_active, sort_order, created_at DESC);

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_announcements_public_read
ON public.site_announcements;

CREATE POLICY site_announcements_public_read
ON public.site_announcements
FOR SELECT
TO anon, authenticated
USING (
  is_active = TRUE
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at > NOW())
);

DROP POLICY IF EXISTS site_announcements_admin_all
ON public.site_announcements;

CREATE POLICY site_announcements_admin_all
ON public.site_announcements
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.customer_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_role TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  product_label TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_testimonials_public_idx
ON public.customer_testimonials(is_approved, is_featured, sort_order, created_at DESC);

ALTER TABLE public.customer_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_testimonials_public_read
ON public.customer_testimonials;

CREATE POLICY customer_testimonials_public_read
ON public.customer_testimonials
FOR SELECT
TO anon, authenticated
USING (is_approved = TRUE);

DROP POLICY IF EXISTS customer_testimonials_admin_all
ON public.customer_testimonials;

CREATE POLICY customer_testimonials_admin_all
ON public.customer_testimonials
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faq_items_public_idx
ON public.faq_items(is_active, sort_order, created_at);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faq_items_public_read
ON public.faq_items;

CREATE POLICY faq_items_public_read
ON public.faq_items
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS faq_items_admin_all
ON public.faq_items;

CREATE POLICY faq_items_admin_all
ON public.faq_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

INSERT INTO public.faq_items (question, answer, sort_order)
SELECT *
FROM (
  VALUES
    (
      'Apakah akun yang dijual sesuai spesifikasi?',
      'Spesifikasi utama ditampilkan pada halaman produk. Bonus yang tidak pasti ditulis terpisah dan tidak dianggap sebagai spesifikasi utama.',
      10
    ),
    (
      'Bagaimana akun dikirim setelah pembayaran?',
      'Setelah pembayaran berhasil diverifikasi, data akun tersedia melalui halaman pesanan pembeli dan dapat diberitahukan lewat email.',
      20
    ),
    (
      'Bagaimana jika akun yang diterima bermasalah?',
      'Hubungi bantuan dengan nomor order dan bukti masalah selama masa garansi. Tim akan memeriksa dan menentukan bantuan, penggantian, atau refund sesuai kebijakan.',
      30
    ),
    (
      'Apakah saya harus membuat akun sebelum checkout?',
      'Tidak. Checkout dapat dilakukan tanpa login. Setelah itu, masuk memakai email yang sama agar seluruh pesanan muncul di Akun Saya.',
      40
    )
) AS seed(question, answer, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.faq_items
);

NOTIFY pgrst, 'reload schema';

COMMIT;
