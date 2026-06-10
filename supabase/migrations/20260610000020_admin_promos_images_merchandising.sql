-- =============================================================================
-- RIKU STORE — Admin promo management, product images, merchandising settings
-- Run AFTER 20260610000019_public_promo_checkout.sql
-- =============================================================================

BEGIN;

-- Public bucket for optimized product images.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  2097152,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
CREATE POLICY product_images_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
CREATE POLICY product_images_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin()
);

DROP POLICY IF EXISTS product_images_admin_update ON storage.objects;
CREATE POLICY product_images_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin()
);

DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_admin()
);

CREATE OR REPLACE FUNCTION public.admin_update_product_merchandising(
  p_product_id UUID,
  p_description TEXT,
  p_price_promo BIGINT,
  p_promo_ends_at TIMESTAMPTZ,
  p_warranty_days INTEGER,
  p_is_popular BOOLEAN,
  p_sort_order INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_price_promo IS NOT NULL AND p_price_promo <= 0 THEN
    RAISE EXCEPTION 'promo price must be greater than zero';
  END IF;

  IF p_warranty_days < 0 OR p_warranty_days > 365 THEN
    RAISE EXCEPTION 'warranty days must be between 0 and 365';
  END IF;

  IF p_sort_order < 0 OR p_sort_order > 999999 THEN
    RAISE EXCEPTION 'sort order is invalid';
  END IF;

  UPDATE public.products
  SET
    description = NULLIF(btrim(COALESCE(p_description, '')), ''),
    price_promo = p_price_promo,
    promo_ends_at = CASE
      WHEN p_price_promo IS NULL THEN NULL
      ELSE p_promo_ends_at
    END,
    warranty_days = p_warranty_days,
    is_popular = p_is_popular,
    sort_order = p_sort_order,
    updated_at = NOW()
  WHERE id = p_product_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found or archived';
  END IF;

  RETURN p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_product_merchandising(
  UUID, TEXT, BIGINT, TIMESTAMPTZ, INTEGER, BOOLEAN, INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_product_merchandising(
  UUID, TEXT, BIGINT, TIMESTAMPTZ, INTEGER, BOOLEAN, INTEGER
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
