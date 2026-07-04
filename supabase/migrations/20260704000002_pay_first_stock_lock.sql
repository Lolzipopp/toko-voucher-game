-- =============================================================================
-- RIKU STORE — Pay-first stock locking
-- Customer checkout no longer marks inventory as reserved before payment.
-- Stock remains visible/available until Pakasir payment is verified.
-- On paid webhook/status verification, fulfillment locks available stock with
-- FOR UPDATE SKIP LOCKED and marks it sold atomically.
-- =============================================================================

BEGIN;

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
  v_customer_usage INTEGER := 0;
  v_email CITEXT := lower(btrim(COALESCE(p_customer_email, '')))::CITEXT;
BEGIN
  SELECT payment_window_minutes
    INTO v_payment_window_minutes
  FROM public.store_settings
  WHERE singleton = TRUE;

  v_payment_window_minutes := COALESCE(v_payment_window_minutes, 1440);
  IF v_payment_window_minutes < 1440 THEN
    v_payment_window_minutes := 1440;
  END IF;
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

  v_order_number := 'RS-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));
  v_access_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.orders(
    order_number, access_token, customer_email, subtotal, discount_amount,
    payment_fee, total_amount, promo_code_id, status, payment_status,
    delivery_status, reservation_expires_at, internal_notes, order_source
  ) VALUES (
    v_order_number, v_access_token, v_email, v_subtotal, v_discount,
    0, v_subtotal - v_discount, CASE WHEN v_promo_code <> '' THEN v_promo.id ELSE NULL END,
    'pending', 'pending', 'pending', v_expires_at, 'PAY_FIRST_NO_STOCK_RESERVE', 'public'
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
  VALUES(v_order_id, 'pakasir', 'qris', v_subtotal - v_discount, 0, 'pending', v_expires_at,
    jsonb_build_object('source', 'public_checkout_v3_pay_first', 'gateway_connected', TRUE, 'payment_window_minutes', v_payment_window_minutes));

  RETURN jsonb_build_object(
    'ok', TRUE, 'order_id', v_order_id, 'order_number', v_order_number,
    'access_token', v_access_token, 'subtotal', v_subtotal,
    'discount_amount', v_discount, 'total_amount', v_subtotal - v_discount,
    'promo_code', NULLIF(v_promo_code, ''), 'payment_expires_at', v_expires_at,
    'payment_window_minutes', v_payment_window_minutes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_order_delivery(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_inventory RECORD;
  v_delivered_count INTEGER := 0;
  v_needed INTEGER;
  v_warranty_days INTEGER := 3;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF v_order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'order_not_paid';
  END IF;

  IF v_order.delivery_status = 'delivered' THEN
    SELECT COUNT(*)::INTEGER INTO v_delivered_count
    FROM public.order_item_inventory oii
    JOIN public.order_items oi ON oi.id = oii.order_item_id
    WHERE oi.order_id = p_order_id;
    RETURN v_delivered_count;
  END IF;

  FOR v_item IN
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, p.warranty_days
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.created_at
  LOOP
    v_needed := v_item.quantity;
    v_warranty_days := COALESCE(v_item.warranty_days, v_warranty_days, 3);

    FOR v_inventory IN
      SELECT ia.id
      FROM public.inventory_accounts ia
      WHERE ia.product_id = v_item.product_id
        AND ia.status = 'available'
        AND ia.archived_at IS NULL
      ORDER BY ia.created_at
      LIMIT v_needed
      FOR UPDATE SKIP LOCKED
    LOOP
      INSERT INTO public.order_item_inventory(order_item_id, inventory_account_id, delivered_at)
      VALUES(v_item.order_item_id, v_inventory.id, NOW())
      ON CONFLICT DO NOTHING;

      UPDATE public.inventory_accounts
      SET status = 'sold', sold_at = NOW(), updated_at = NOW()
      WHERE id = v_inventory.id AND status = 'available';

      IF FOUND THEN
        v_delivered_count := v_delivered_count + 1;
      END IF;
    END LOOP;

    IF v_delivered_count < v_needed THEN
      RAISE EXCEPTION 'insufficient_stock_on_paid_order';
    END IF;
  END LOOP;

  UPDATE public.orders
  SET
    status = 'completed',
    delivery_status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW()),
    warranty_ends_at = COALESCE(warranty_ends_at, NOW() + make_interval(days => v_warranty_days)),
    credentials_hidden_at = NULL,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_delivered_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_checkout_order_v3(TEXT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.fulfill_order_delivery(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_order_delivery(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
