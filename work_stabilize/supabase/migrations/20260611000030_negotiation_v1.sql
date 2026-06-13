-- =============================================================================
-- RIKU STORE — Negotiation V1
-- Remove comparison from product UX and add per-product WhatsApp negotiation.
-- Run AFTER 20260611000029_manual_sales_launch_v1.sql
-- =============================================================================

BEGIN;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS allow_negotiation BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS negotiation_min_price BIGINT;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_negotiation_min_price_check;

ALTER TABLE public.products
ADD CONSTRAINT products_negotiation_min_price_check
CHECK (
  negotiation_min_price IS NULL
  OR negotiation_min_price > 0
);

CREATE OR REPLACE FUNCTION public.admin_update_product_negotiation(
  p_product_id UUID,
  p_allow_negotiation BOOLEAN,
  p_negotiation_min_price BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_effective_price BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  v_effective_price := COALESCE(
    CASE
      WHEN v_product.price_promo IS NOT NULL
       AND (
         v_product.promo_ends_at IS NULL
         OR v_product.promo_ends_at > NOW()
       )
      THEN v_product.price_promo
      ELSE NULL
    END,
    v_product.price_normal
  );

  IF p_allow_negotiation
     AND p_negotiation_min_price IS NOT NULL
     AND p_negotiation_min_price >= v_effective_price THEN
    RAISE EXCEPTION 'negotiation_min_must_be_below_price';
  END IF;

  UPDATE public.products
  SET
    allow_negotiation = p_allow_negotiation,
    negotiation_min_price = CASE
      WHEN p_allow_negotiation THEN p_negotiation_min_price
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    entity_type,
    entity_id,
    new_values
  )
  VALUES (
    auth.uid(),
    'product.negotiation.update',
    'product',
    p_product_id,
    jsonb_build_object(
      'allow_negotiation', p_allow_negotiation,
      'negotiation_min_price',
        CASE
          WHEN p_allow_negotiation THEN p_negotiation_min_price
          ELSE NULL
        END
    )
  );

  RETURN p_product_id;
END;
$$;

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
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY sort_order, name),
    '[]'::jsonb
  )
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
           AND (
             p.promo_ends_at IS NULL
             OR p.promo_ends_at > NOW()
           )
          THEN p.price_promo
          ELSE NULL
        END,
        'promo_ends_at', p.promo_ends_at,
        'warranty_days', p.warranty_days,
        'is_popular', p.is_popular,
        'allow_negotiation', p.allow_negotiation,
        'negotiation_min_price', CASE
          WHEN p.allow_negotiation
          THEN p.negotiation_min_price
          ELSE NULL
        END,
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
          ORDER BY
            pi.is_primary DESC,
            pi.sort_order ASC,
            pi.created_at ASC
          LIMIT 1
        ),
        'attributes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'key', pa.attribute_key,
              'value', pa.attribute_value
            )
            ORDER BY pa.display_order, pa.attribute_key
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
      AND (
        p_game_slug IS NULL
        OR btrim(p_game_slug) = ''
        OR g.slug = btrim(p_game_slug)
      )
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
              pa_search.attribute_key
                ILIKE '%' || btrim(p_search) || '%'
              OR pa_search.attribute_value
                ILIKE '%' || btrim(p_search) || '%'
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
       AND (
         p.promo_ends_at IS NULL
         OR p.promo_ends_at > NOW()
       )
      THEN p.price_promo
      ELSE NULL
    END,
    'promo_ends_at', p.promo_ends_at,
    'warranty_days', p.warranty_days,
    'is_popular', p.is_popular,
    'allow_negotiation', p.allow_negotiation,
    'negotiation_min_price', CASE
      WHEN p.allow_negotiation
      THEN p.negotiation_min_price
      ELSE NULL
    END,
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
    'images', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'path', pi.storage_path,
          'alt', COALESCE(pi.alt_text, p.name),
          'is_primary', pi.is_primary
        )
        ORDER BY
          pi.is_primary DESC,
          pi.sort_order,
          pi.created_at
      )
      FROM public.product_images pi
      WHERE pi.product_id = p.id
    ), '[]'::jsonb),
    'attributes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'key', pa.attribute_key,
          'value', pa.attribute_value
        )
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

REVOKE ALL ON FUNCTION public.admin_update_product_negotiation(
  UUID, BOOLEAN, BIGINT
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_product_negotiation(
  UUID, BOOLEAN, BIGINT
)
TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_catalog(TEXT, TEXT)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_public_product_by_slug(TEXT)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT)
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT)
TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
