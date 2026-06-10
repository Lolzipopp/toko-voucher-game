-- =============================================================================
-- RIKU STORE — Email delivery log + safe public catalog RPCs
-- Run AFTER 20260609000015_secure_order_delivery.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_email_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  recipient_email     CITEXT NOT NULL,
  provider            TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status              TEXT NOT NULL,
  error_message       TEXT,
  sent_by             UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_email_deliveries_status_check
    CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_order_email_deliveries_order_created
  ON public.order_email_deliveries(order_id, created_at DESC);

ALTER TABLE public.order_email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_email_deliveries_admin_read
  ON public.order_email_deliveries;
CREATE POLICY order_email_deliveries_admin_read
  ON public.order_email_deliveries
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS order_email_deliveries_admin_insert
  ON public.order_email_deliveries;
CREATE POLICY order_email_deliveries_admin_insert
  ON public.order_email_deliveries
  FOR INSERT WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_public_catalog(
  p_game_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_order, name), '[]'::jsonb)
  FROM (
    SELECT
      p.sort_order,
      p.name,
      jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'name', p.name,
        'description', p.description,
        'product_type', p.product_type,
        'price_normal', p.price_normal,
        'price_promo', CASE
          WHEN p.price_promo IS NOT NULL
           AND (p.promo_ends_at IS NULL OR p.promo_ends_at > NOW())
          THEN p.price_promo
          ELSE NULL
        END,
        'promo_ends_at', p.promo_ends_at,
        'warranty_days', p.warranty_days,
        'is_popular', p.is_popular,
        'game', jsonb_build_object(
          'name', g.name,
          'slug', g.slug
        ),
        'available_stock', (
          SELECT COUNT(*)::INTEGER
          FROM public.inventory_accounts ia
          WHERE ia.product_id = p.id
            AND ia.status = 'available'
            AND ia.archived_at IS NULL
        ),
        'primary_image_path', (
          SELECT pi.storage_path
          FROM public.product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.created_at ASC
          LIMIT 1
        ),
        'attributes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'key', pa.attribute_key,
              'value', pa.attribute_value
            ) ORDER BY pa.display_order, pa.attribute_key
          )
          FROM public.product_attributes pa
          WHERE pa.product_id = p.id
        ), '[]'::jsonb)
      ) AS row_data
    FROM public.products p
    JOIN public.games g ON g.id = p.game_id
    WHERE p.status = 'active'
      AND p.archived_at IS NULL
      AND g.is_active = TRUE
      AND (p_game_slug IS NULL OR btrim(p_game_slug) = '' OR g.slug = btrim(p_game_slug))
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR p.name ILIKE '%' || btrim(p_search) || '%'
        OR p.product_code ILIKE '%' || btrim(p_search) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.product_attributes pa_search
          WHERE pa_search.product_id = p.id
            AND (
              pa_search.attribute_key ILIKE '%' || btrim(p_search) || '%'
              OR pa_search.attribute_value ILIKE '%' || btrim(p_search) || '%'
            )
        )
      )
  ) catalog_rows;
$$;

CREATE OR REPLACE FUNCTION public.get_public_product_by_slug(
  p_slug TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'name', p.name,
    'description', p.description,
    'product_type', p.product_type,
    'price_normal', p.price_normal,
    'price_promo', CASE
      WHEN p.price_promo IS NOT NULL
       AND (p.promo_ends_at IS NULL OR p.promo_ends_at > NOW())
      THEN p.price_promo
      ELSE NULL
    END,
    'promo_ends_at', p.promo_ends_at,
    'warranty_days', p.warranty_days,
    'is_popular', p.is_popular,
    'game', jsonb_build_object('name', g.name, 'slug', g.slug),
    'available_stock', (
      SELECT COUNT(*)::INTEGER
      FROM public.inventory_accounts ia
      WHERE ia.product_id = p.id
        AND ia.status = 'available'
        AND ia.archived_at IS NULL
    ),
    'images', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'path', pi.storage_path,
          'alt', COALESCE(pi.alt_text, p.name),
          'is_primary', pi.is_primary
        ) ORDER BY pi.is_primary DESC, pi.sort_order, pi.created_at
      )
      FROM public.product_images pi
      WHERE pi.product_id = p.id
    ), '[]'::jsonb),
    'attributes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('key', pa.attribute_key, 'value', pa.attribute_value)
        ORDER BY pa.display_order, pa.attribute_key
      )
      FROM public.product_attributes pa
      WHERE pa.product_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.products p
  JOIN public.games g ON g.id = p.game_id
  WHERE p.slug = btrim(p_slug)
    AND p.status = 'active'
    AND p.archived_at IS NULL
    AND g.is_active = TRUE
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_product_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT)
  TO anon, authenticated, service_role;

COMMIT;
