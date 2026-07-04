-- =============================================================================
-- RIKU STORE — Buyer pays Pakasir QRIS fee
-- Harga katalog tetap. Total checkout ditambah estimasi fee Pakasir agar net
-- merchant mendekati harga produk setelah fee dipotong Pakasir.
-- Fee QRIS Pakasir per pricing 2026-06-22:
-- - <= Rp105.000: 0.7% + Rp310
-- - >  Rp105.000: 1% + Rp0
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_pakasir_qris_gross_amount(
  p_net_amount BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_net BIGINT := GREATEST(COALESCE(p_net_amount, 0), 0);
  v_gross BIGINT;
  v_fee BIGINT;
BEGIN
  IF v_net <= 0 THEN
    RETURN jsonb_build_object('gross_amount', 0, 'fee_amount', 0, 'rate', 0, 'fixed_fee', 0);
  END IF;

  -- Solve gross - (gross * 0.7% + 310) >= net.
  v_gross := CEIL((v_net + 310)::NUMERIC / 0.993)::BIGINT;

  -- Pakasir note: above Rp105.000 fee becomes 1% + Rp0.
  IF v_gross > 105000 THEN
    v_gross := CEIL(v_net::NUMERIC / 0.99)::BIGINT;
    v_fee := v_gross - v_net;
    RETURN jsonb_build_object(
      'gross_amount', v_gross,
      'fee_amount', v_fee,
      'rate', 0.01,
      'fixed_fee', 0
    );
  END IF;

  v_fee := v_gross - v_net;
  RETURN jsonb_build_object(
    'gross_amount', v_gross,
    'fee_amount', v_fee,
    'rate', 0.007,
    'fixed_fee', 310
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
  v_payment_window_minutes INTEGER := 1440;
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
  v_available_count INTEGER;
  v_promo public.promo_codes%ROWTYPE;
  v_promo_code TEXT := upper(btrim(COALESCE(p_promo_code, '')));
  v_eligible_subtotal BIGINT := 0;
  v_discount BIGINT := 0;
  v_payment_fee BIGINT := 0;
  v_total_amount BIGINT := 0;
  v_fee_calc JSONB;
  v_customer_usage INTEGER := 0;
  v_email CITEXT := lower(btrim(COALESCE(p_customer_email, '')))::CITEXT;
BEGIN
  SELECT payment_window_minutes INTO v_payment_window_minutes
  FROM public.store_settings
  WHERE singleton = TRUE;

  v_payment_window_minutes := COALESCE(v_payment_window_minutes, 1440);
  IF v_payment_window_minutes < 1440 THEN v_payment_window_minutes := 1440; END IF;
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

    IF NOT FOUND OR NOT v_promo.is_active OR v_promo.valid_from > NOW()
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

    SELECT COUNT(*)::INTEGER INTO v_available_count
    FROM public.inventory_accounts ia
    WHERE ia.product_id = v_product_id
      AND ia.status = 'available'
      AND ia.archived_at IS NULL;
    IF v_available_count < v_quantity THEN PERFORM public.raise_riku_error('INSUFFICIENT_STOCK'); END IF;

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

  v_fee_calc := public.calculate_pakasir_qris_gross_amount(v_subtotal - v_discount);
  v_total_amount := (v_fee_calc->>'gross_amount')::BIGINT;
  v_payment_fee := v_total_amount - (v_subtotal - v_discount);

  v_order_number := 'RS-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));
  v_access_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.orders(
    order_number, access_token, customer_email, subtotal, discount_amount,
    payment_fee, total_amount, promo_code_id, status, payment_status,
    delivery_status, reservation_expires_at, internal_notes, order_source
  ) VALUES (
    v_order_number, v_access_token, v_email, v_subtotal, v_discount,
    v_payment_fee, v_total_amount, CASE WHEN v_promo_code <> '' THEN v_promo.id ELSE NULL END,
    'pending', 'pending', 'pending', v_expires_at, 'PAY_FIRST_BUYER_PAYS_PAKASIR_FEE', 'public'
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
  END LOOP;

  INSERT INTO public.payments(order_id, provider, payment_method, amount, fee, status, expired_at, provider_payload)
  VALUES(v_order_id, 'pakasir', 'qris', v_total_amount, v_payment_fee, 'pending', v_expires_at,
    jsonb_build_object('source', 'public_checkout_v3_buyer_pays_pakasir_fee', 'gateway_connected', TRUE, 'payment_window_minutes', v_payment_window_minutes, 'fee_calc', v_fee_calc));

  RETURN jsonb_build_object(
    'ok', TRUE, 'order_id', v_order_id, 'order_number', v_order_number,
    'access_token', v_access_token, 'subtotal', v_subtotal,
    'discount_amount', v_discount, 'payment_fee', v_payment_fee,
    'total_amount', v_total_amount, 'promo_code', NULLIF(v_promo_code, ''),
    'payment_expires_at', v_expires_at, 'payment_window_minutes', v_payment_window_minutes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_pakasir_qris_gross_amount(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_pakasir_qris_gross_amount(BIGINT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
