-- =============================================================================
-- RIKU STORE — Stabilization & Security V1
-- Final checkout state, abuse protection, promo accounting, structured errors.
-- Run AFTER 20260610000020_admin_promos_images_merchandising.sql
-- =============================================================================

BEGIN;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'public'
CHECK (order_source IN ('public', 'admin_test', 'manual'));

UPDATE public.orders
SET order_source = CASE
  WHEN internal_notes = 'INTERNAL TEST ORDER — not a real customer transaction' THEN 'admin_test'
  WHEN internal_notes IN ('PUBLIC CHECKOUT V1', 'PUBLIC CHECKOUT V2') THEN 'public'
  ELSE order_source
END;

CREATE TABLE IF NOT EXISTS public.checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key TEXT NOT NULL,
  customer_email CITEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkout_attempts_request_created_idx
ON public.checkout_attempts(request_key, created_at DESC);

CREATE INDEX IF NOT EXISTS checkout_attempts_email_created_idx
ON public.checkout_attempts(customer_email, created_at DESC);

ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.checkout_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.checkout_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.raise_riku_error(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'RIKU_ERROR:%', p_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_order_promo_redemption(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.promo_code_id IS NULL OR v_order.payment_status <> 'paid' THEN
    RETURN;
  END IF;

  INSERT INTO public.promo_code_redemptions(promo_code_id, order_id, customer_email, discount_amount)
  VALUES(v_order.promo_code_id, v_order.id, v_order.customer_email, v_order.discount_amount)
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    UPDATE public.promo_codes
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = v_order.promo_code_id;
  END IF;
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
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '20 minutes';
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

    v_reserved_count := public.reserve_stock_for_order(v_order_id, v_product_id, v_quantity, 20);
    IF v_reserved_count <> v_quantity THEN PERFORM public.raise_riku_error('INSUFFICIENT_STOCK'); END IF;
  END LOOP;

  INSERT INTO public.payments(order_id, provider, payment_method, amount, fee, status, expired_at, provider_payload)
  VALUES(v_order_id, 'pending_gateway', 'not_selected', v_subtotal - v_discount, 0, 'pending', v_expires_at,
    jsonb_build_object('source', 'public_checkout_v3', 'gateway_connected', FALSE, 'payment_window_minutes', 20));

  RETURN jsonb_build_object(
    'ok', TRUE, 'order_id', v_order_id, 'order_number', v_order_number,
    'access_token', v_access_token, 'subtotal', v_subtotal,
    'discount_amount', v_discount, 'total_amount', v_subtotal - v_discount,
    'promo_code', NULLIF(v_promo_code, ''), 'payment_expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_checkout_status(p_access_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_released_count INTEGER := 0;
  v_state TEXT;
  v_promo_code TEXT;
BEGIN
  IF p_access_token IS NULL OR length(btrim(p_access_token)) < 32 OR length(btrim(p_access_token)) > 256 THEN
    RETURN jsonb_build_object('ok', FALSE, 'state', 'not_found');
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE access_token = btrim(p_access_token) AND order_source = 'public'
  LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', FALSE, 'state', 'not_found'); END IF;

  IF v_order.payment_status IN ('pending', 'processing')
     AND v_order.status IN ('pending', 'processing')
     AND v_order.reservation_expires_at IS NOT NULL
     AND v_order.reservation_expires_at <= NOW() THEN
    v_released_count := public.release_stock_reservations(v_order.id, 'public_checkout_expired');
    UPDATE public.orders SET status = 'expired', payment_status = 'expired', updated_at = NOW()
    WHERE id = v_order.id RETURNING * INTO v_order;
    UPDATE public.payments SET status = 'expired', expired_at = COALESCE(expired_at, NOW()), updated_at = NOW()
    WHERE order_id = v_order.id AND status IN ('pending', 'processing');
  END IF;

  SELECT code INTO v_promo_code FROM public.promo_codes WHERE id = v_order.promo_code_id;

  v_state := CASE
    WHEN v_order.payment_status = 'paid' AND v_order.delivery_status = 'delivered' THEN 'delivered'
    WHEN v_order.payment_status = 'paid' THEN 'paid'
    WHEN v_order.status = 'expired' OR v_order.payment_status = 'expired' THEN 'expired'
    WHEN v_order.payment_status = 'failed' THEN 'failed'
    ELSE 'awaiting_payment'
  END;

  RETURN jsonb_build_object(
    'ok', TRUE, 'state', v_state, 'order_number', v_order.order_number,
    'subtotal', v_order.subtotal, 'discount_amount', v_order.discount_amount,
    'total_amount', v_order.total_amount, 'promo_code', v_promo_code,
    'order_status', v_order.status, 'payment_status', v_order.payment_status,
    'delivery_status', v_order.delivery_status,
    'payment_expires_at', v_order.reservation_expires_at,
    'released_stock_count', v_released_count, 'server_now', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_checkout_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_checkout_status(TEXT) TO anon, authenticated, service_role;

-- Ensure internal paid simulation also finalizes promo usage.
CREATE OR REPLACE FUNCTION public.admin_finalize_test_order_promo(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  PERFORM public.finalize_order_promo_redemption(p_order_id);
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
