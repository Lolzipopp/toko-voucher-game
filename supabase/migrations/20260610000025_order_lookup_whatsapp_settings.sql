-- =============================================================================
-- RIKU STORE — Order lookup, WhatsApp support, and store settings
-- Run AFTER 20260610000024_inventory_promo_cleanup.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.store_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  store_name TEXT NOT NULL DEFAULT 'RIKU STORE',
  store_tagline TEXT NOT NULL DEFAULT 'Akun Roblox Instan',
  support_email TEXT,
  whatsapp_number TEXT,
  payment_window_minutes INTEGER NOT NULL DEFAULT 20
    CHECK (payment_window_minutes BETWEEN 5 AND 60),
  default_warranty_days INTEGER NOT NULL DEFAULT 3
    CHECK (default_warranty_days BETWEEN 0 AND 365),
  credential_visibility_days INTEGER NOT NULL DEFAULT 7
    CHECK (credential_visibility_days BETWEEN 1 AND 30),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.store_settings(singleton)
VALUES(TRUE)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_settings_admin_read ON public.store_settings;
CREATE POLICY store_settings_admin_read
ON public.store_settings FOR SELECT TO authenticated
USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.order_lookup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_lookup_attempts_key_created_idx
ON public.order_lookup_attempts(request_key, created_at DESC);

ALTER TABLE public.order_lookup_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_lookup_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.order_lookup_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_store_settings()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'store_name', store_name,
    'store_tagline', store_tagline,
    'support_email', support_email,
    'whatsapp_number', whatsapp_number,
    'payment_window_minutes', payment_window_minutes,
    'default_warranty_days', default_warranty_days,
    'credential_visibility_days', credential_visibility_days
  )
  FROM public.store_settings
  WHERE singleton = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_store_settings(
  p_store_name TEXT,
  p_store_tagline TEXT,
  p_support_email TEXT,
  p_whatsapp_number TEXT,
  p_payment_window_minutes INTEGER,
  p_default_warranty_days INTEGER,
  p_credential_visibility_days INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_whatsapp TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NULLIF(btrim(COALESCE(p_store_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'store_name_required';
  END IF;
  IF p_payment_window_minutes NOT BETWEEN 5 AND 60 THEN
    RAISE EXCEPTION 'invalid_payment_window';
  END IF;
  IF p_default_warranty_days NOT BETWEEN 0 AND 365 THEN
    RAISE EXCEPTION 'invalid_warranty_days';
  END IF;
  IF p_credential_visibility_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'invalid_credential_visibility_days';
  END IF;

  v_whatsapp := regexp_replace(COALESCE(p_whatsapp_number, ''), '[^0-9]', '', 'g');
  IF left(v_whatsapp, 1) = '0' THEN
    v_whatsapp := '62' || substr(v_whatsapp, 2);
  END IF;

  UPDATE public.store_settings SET
    store_name = btrim(p_store_name),
    store_tagline = COALESCE(NULLIF(btrim(p_store_tagline), ''), 'Akun Roblox Instan'),
    support_email = NULLIF(lower(btrim(COALESCE(p_support_email, ''))), ''),
    whatsapp_number = NULLIF(v_whatsapp, ''),
    payment_window_minutes = p_payment_window_minutes,
    default_warranty_days = p_default_warranty_days,
    credential_visibility_days = p_credential_visibility_days,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE singleton = TRUE;

  INSERT INTO public.admin_audit_logs(admin_user_id, action, entity_type, new_values)
  VALUES(auth.uid(), 'store.settings.update', 'store_settings', jsonb_build_object(
    'store_name', btrim(p_store_name),
    'payment_window_minutes', p_payment_window_minutes,
    'default_warranty_days', p_default_warranty_days,
    'credential_visibility_days', p_credential_visibility_days
  ));

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_public_order(
  p_order_number TEXT,
  p_customer_email TEXT,
  p_request_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  DELETE FROM public.order_lookup_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';

  IF p_request_key IS NULL OR length(p_request_key) <> 64 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'RATE_LIMIT');
  END IF;

  IF (SELECT COUNT(*) FROM public.order_lookup_attempts
      WHERE request_key = p_request_key
        AND created_at > NOW() - INTERVAL '10 minutes') >= 8 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'RATE_LIMIT');
  END IF;

  INSERT INTO public.order_lookup_attempts(request_key) VALUES(p_request_key);
  PERFORM public.repair_expired_stock_reservations();

  SELECT * INTO v_order
  FROM public.orders
  WHERE upper(order_number) = upper(btrim(COALESCE(p_order_number, '')))
    AND lower(customer_email::TEXT) = lower(btrim(COALESCE(p_customer_email, '')))
    AND order_source = 'public'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'access_token', v_order.access_token,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'delivery_status', v_order.delivery_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_checkout_order_v3(
  p_customer_email TEXT,
  p_items JSONB,
  p_promo_code TEXT DEFAULT NULL,
  p_request_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number TEXT;
  v_access_token TEXT;
  v_payment_window_minutes INTEGER := 20;
  v_expires_at TIMESTAMPTZ;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price BIGINT;
  v_line_total BIGINT;
  v_subtotal BIGINT := 0;
  v_total_quantity INTEGER := 0;
  v_attributes JSONB;
  v_reserved_count INTEGER;
  v_promo public.promo_codes%ROWTYPE;
  v_promo_code TEXT := upper(btrim(COALESCE(p_promo_code, '')));
  v_eligible_subtotal BIGINT := 0;
  v_discount BIGINT := 0;
  v_customer_usage INTEGER := 0;
  v_email CITEXT := lower(btrim(COALESCE(p_customer_email, '')))::CITEXT;
BEGIN
  SELECT payment_window_minutes
    INTO v_payment_window_minutes
  FROM public.store_settings
  WHERE singleton = TRUE;

  v_payment_window_minutes := COALESCE(v_payment_window_minutes, 20);
  v_expires_at := NOW() + make_interval(mins => v_payment_window_minutes);

  PERFORM public.release_expired_public_checkout_orders();
  DELETE FROM public.checkout_attempts WHERE created_at < NOW() - INTERVAL '24 hours';

  IF v_email::TEXT = '' OR length(v_email::TEXT) > 254
     OR v_email::TEXT !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    PERFORM public.raise_riku_error('INVALID_CUSTOMER_EMAIL');
  END IF;

  IF p_request_key IS NULL OR length(p_request_key) <> 64 THEN
    PERFORM public.raise_riku_error('CHECKOUT_RATE_LIMIT');
  END IF;

  IF (SELECT COUNT(*) FROM public.checkout_attempts
      WHERE request_key = p_request_key AND created_at > NOW() - INTERVAL '10 minutes') >= 5 THEN
    PERFORM public.raise_riku_error('CHECKOUT_RATE_LIMIT');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_email = v_email
      AND order_source = 'public'
      AND status IN ('pending', 'processing')
      AND payment_status IN ('pending', 'processing')
      AND reservation_expires_at > NOW()
  ) THEN
    PERFORM public.raise_riku_error('ACTIVE_ORDER_EXISTS');
  END IF;

  INSERT INTO public.checkout_attempts(request_key, customer_email)
  VALUES(p_request_key, v_email);

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 20 THEN
    PERFORM public.raise_riku_error('INVALID_CART');
  END IF;

  IF EXISTS (
    SELECT 1 FROM (
      SELECT value->>'product_id' AS product_id, COUNT(*)
      FROM jsonb_array_elements(p_items)
      GROUP BY value->>'product_id'
      HAVING COUNT(*) > 1
    ) d
  ) THEN
    PERFORM public.raise_riku_error('DUPLICATE_PRODUCT_IN_CART');
  END IF;

  IF v_promo_code <> '' THEN
    SELECT * INTO v_promo FROM public.promo_codes
    WHERE upper(code) = v_promo_code FOR UPDATE;

    IF NOT FOUND OR NOT v_promo.is_active
       OR v_promo.valid_from > NOW()
       OR (v_promo.valid_until IS NOT NULL AND v_promo.valid_until <= NOW()) THEN
      PERFORM public.raise_riku_error('PROMO_INVALID');
    END IF;

    IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit THEN
      PERFORM public.raise_riku_error('PROMO_USAGE_LIMIT');
    END IF;

    IF v_promo.per_customer_limit IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_customer_usage
      FROM public.promo_code_redemptions
      WHERE promo_code_id = v_promo.id AND customer_email = v_email;
      IF v_customer_usage >= v_promo.per_customer_limit THEN
        PERFORM public.raise_riku_error('PROMO_CUSTOMER_LIMIT');
      END IF;
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      PERFORM public.raise_riku_error('INVALID_CART');
    END;

    IF v_quantity < 1 OR v_quantity > 20 THEN PERFORM public.raise_riku_error('INVALID_QUANTITY'); END IF;

    SELECT * INTO v_product FROM public.products
    WHERE id = v_product_id AND status = 'active' AND archived_at IS NULL FOR SHARE;
    IF NOT FOUND THEN PERFORM public.raise_riku_error('PRODUCT_UNAVAILABLE'); END IF;
    IF v_product.product_type = 'unique' AND v_quantity <> 1 THEN PERFORM public.raise_riku_error('UNIQUE_PRODUCT_QUANTITY'); END IF;

    v_unit_price := CASE WHEN v_product.price_promo IS NOT NULL
      AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo ELSE v_product.price_normal END;
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_quantity := v_total_quantity + v_quantity;

    IF v_promo_code <> '' AND (
      (COALESCE(array_length(v_promo.applicable_product_ids, 1), 0) = 0
       AND COALESCE(array_length(v_promo.applicable_game_ids, 1), 0) = 0)
      OR v_product.id = ANY(COALESCE(v_promo.applicable_product_ids, '{}'::UUID[]))
      OR v_product.game_id = ANY(COALESCE(v_promo.applicable_game_ids, '{}'::UUID[]))
    ) THEN
      v_eligible_subtotal := v_eligible_subtotal + v_line_total;
    END IF;
  END LOOP;

  IF v_total_quantity > 50 THEN PERFORM public.raise_riku_error('INVALID_QUANTITY'); END IF;

  IF v_promo_code <> '' THEN
    IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount THEN PERFORM public.raise_riku_error('PROMO_MINIMUM_NOT_MET'); END IF;
    IF v_eligible_subtotal <= 0 THEN PERFORM public.raise_riku_error('PROMO_NOT_APPLICABLE'); END IF;
    v_discount := CASE WHEN v_promo.discount_type = 'percentage'
      THEN floor(v_eligible_subtotal * v_promo.discount_value / 100)::BIGINT
      ELSE v_promo.discount_value::BIGINT END;
    IF v_promo.max_discount_amount IS NOT NULL THEN v_discount := LEAST(v_discount, v_promo.max_discount_amount); END IF;
    v_discount := LEAST(v_discount, v_eligible_subtotal, v_subtotal);
  END IF;

  v_order_number := 'RS-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));
  v_access_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.orders(
    order_number, access_token, customer_email, subtotal, discount_amount,
    payment_fee, total_amount, promo_code_id, status, payment_status,
    delivery_status, reservation_expires_at, internal_notes, order_source
  ) VALUES (
    v_order_number, v_access_token, v_email, v_subtotal, v_discount,
    0, v_subtotal - v_discount, CASE WHEN v_promo_code <> '' THEN v_promo.id ELSE NULL END,
    'pending', 'pending', 'pending', v_expires_at, NULL, 'public'
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT * INTO v_product FROM public.products WHERE id = v_product_id FOR SHARE;
    v_unit_price := CASE WHEN v_product.price_promo IS NOT NULL
      AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo ELSE v_product.price_normal END;
    v_line_total := v_unit_price * v_quantity;
    SELECT COALESCE(jsonb_object_agg(attribute_key, attribute_value ORDER BY display_order), '{}'::JSONB)
      INTO v_attributes FROM public.product_attributes WHERE product_id = v_product_id;

    INSERT INTO public.order_items(order_id, product_id, quantity, unit_price, line_total, product_name_snapshot, product_attributes_snapshot)
    VALUES(v_order_id, v_product_id, v_quantity, v_unit_price, v_line_total, v_product.name, v_attributes)
    RETURNING id INTO v_order_item_id;

    v_reserved_count := public.reserve_stock_for_order(v_order_id, v_product_id, v_quantity, v_payment_window_minutes);
    IF v_reserved_count <> v_quantity THEN PERFORM public.raise_riku_error('INSUFFICIENT_STOCK'); END IF;
  END LOOP;

  INSERT INTO public.payments(order_id, provider, payment_method, amount, fee, status, expired_at, provider_payload)
  VALUES(v_order_id, 'pending_gateway', 'not_selected', v_subtotal - v_discount, 0, 'pending', v_expires_at,
    jsonb_build_object('source', 'public_checkout_v3', 'gateway_connected', FALSE, 'payment_window_minutes', v_payment_window_minutes));

  RETURN jsonb_build_object(
    'ok', TRUE, 'order_id', v_order_id, 'order_number', v_order_number,
    'access_token', v_access_token, 'subtotal', v_subtotal,
    'discount_amount', v_discount, 'total_amount', v_subtotal - v_discount,
    'promo_code', NULLIF(v_promo_code, ''), 'payment_expires_at', v_expires_at,
    'payment_window_minutes', v_payment_window_minutes
  );
END;
$$;



REVOKE ALL ON FUNCTION public.get_public_store_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_settings() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_store_settings(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_store_settings(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER)
TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.lookup_public_order(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_public_order(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT)
TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
