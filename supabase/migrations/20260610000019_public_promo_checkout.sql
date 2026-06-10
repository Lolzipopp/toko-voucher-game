-- =============================================================================
-- RIKU STORE — Public promo validation + promo checkout + final order summary
-- Run AFTER 20260610000018_payment_window_20_minutes.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_public_promo(
  p_customer_email TEXT,
  p_items JSONB,
  p_promo_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price BIGINT;
  v_line_total BIGINT;
  v_subtotal BIGINT := 0;
  v_eligible_subtotal BIGINT := 0;
  v_discount BIGINT := 0;
  v_customer_usage INTEGER := 0;
  v_code TEXT := upper(btrim(COALESCE(p_promo_code, '')));
BEGIN
  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Masukkan kode promo.');
  END IF;

  IF NULLIF(btrim(p_customer_email), '') IS NULL
     OR btrim(p_customer_email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Isi email aktif sebelum memakai promo.');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Keranjang masih kosong.');
  END IF;

  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE upper(code) = v_code
  LIMIT 1;

  IF NOT FOUND OR NOT v_promo.is_active THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Kode promo tidak ditemukan atau sudah tidak aktif.');
  END IF;

  IF v_promo.valid_from > NOW()
     OR (v_promo.valid_until IS NOT NULL AND v_promo.valid_until <= NOW()) THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Kode promo belum berlaku atau sudah berakhir.');
  END IF;

  IF v_promo.usage_limit IS NOT NULL
     AND v_promo.usage_count >= v_promo.usage_limit THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Kuota kode promo sudah habis.');
  END IF;

  IF v_promo.per_customer_limit IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_customer_usage
    FROM public.promo_code_redemptions
    WHERE promo_code_id = v_promo.id
      AND customer_email = lower(btrim(p_customer_email))::CITEXT;

    IF v_customer_usage >= v_promo.per_customer_limit THEN
      RETURN jsonb_build_object('ok', FALSE, 'message', 'Email ini sudah mencapai batas penggunaan promo.');
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', FALSE, 'message', 'Isi keranjang tidak valid.');
    END;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_product_id
      AND status = 'active'
      AND archived_at IS NULL;

    IF NOT FOUND OR v_quantity < 1 OR v_quantity > 20 THEN
      RETURN jsonb_build_object('ok', FALSE, 'message', 'Salah satu produk sudah tidak tersedia.');
    END IF;

    v_unit_price := CASE
      WHEN v_product.price_promo IS NOT NULL
       AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo
      ELSE v_product.price_normal
    END;
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    IF
      (COALESCE(array_length(v_promo.applicable_product_ids, 1), 0) = 0
       AND COALESCE(array_length(v_promo.applicable_game_ids, 1), 0) = 0)
      OR v_product.id = ANY(COALESCE(v_promo.applicable_product_ids, '{}'::UUID[]))
      OR v_product.game_id = ANY(COALESCE(v_promo.applicable_game_ids, '{}'::UUID[]))
    THEN
      v_eligible_subtotal := v_eligible_subtotal + v_line_total;
    END IF;
  END LOOP;

  IF v_promo.min_order_amount IS NOT NULL
     AND v_subtotal < v_promo.min_order_amount THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'message', 'Minimum belanja promo belum terpenuhi.',
      'minimum_order_amount', v_promo.min_order_amount
    );
  END IF;

  IF v_eligible_subtotal <= 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Promo tidak berlaku untuk produk di keranjang ini.');
  END IF;

  IF v_promo.discount_type = 'percentage' THEN
    v_discount := floor(v_eligible_subtotal * v_promo.discount_value / 100)::BIGINT;
  ELSE
    v_discount := v_promo.discount_value::BIGINT;
  END IF;

  IF v_promo.max_discount_amount IS NOT NULL THEN
    v_discount := LEAST(v_discount, v_promo.max_discount_amount);
  END IF;

  v_discount := LEAST(v_discount, v_eligible_subtotal, v_subtotal);

  IF v_discount <= 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'message', 'Promo belum menghasilkan diskon untuk pesanan ini.');
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'promo_id', v_promo.id,
    'code', v_promo.code,
    'description', v_promo.description,
    'subtotal', v_subtotal,
    'eligible_subtotal', v_eligible_subtotal,
    'discount_amount', v_discount,
    'total_amount', v_subtotal - v_discount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_public_promo(TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_public_promo(TEXT, JSONB, TEXT)
TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_public_checkout_order_v2(
  p_customer_email TEXT,
  p_items JSONB,
  p_promo_code TEXT DEFAULT NULL,
  p_payment_minutes INTEGER DEFAULT 20
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
  v_payment_window CONSTANT INTEGER := 20;
BEGIN
  PERFORM public.release_expired_public_checkout_orders();

  IF NULLIF(btrim(p_customer_email), '') IS NULL
     OR length(btrim(p_customer_email)) > 254
     OR btrim(p_customer_email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'invalid_customer_email';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1
     OR jsonb_array_length(p_items) > 20 THEN
    RAISE EXCEPTION 'invalid_cart';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (
      SELECT value->>'product_id' product_id, COUNT(*)
      FROM jsonb_array_elements(p_items)
      GROUP BY value->>'product_id'
      HAVING COUNT(*) > 1
    ) d
  ) THEN
    RAISE EXCEPTION 'duplicate_product_in_cart';
  END IF;

  IF v_promo_code <> '' THEN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE upper(code) = v_promo_code
    FOR UPDATE;

    IF NOT FOUND OR NOT v_promo.is_active THEN RAISE EXCEPTION 'promo_invalid'; END IF;
    IF v_promo.valid_from > NOW()
       OR (v_promo.valid_until IS NOT NULL AND v_promo.valid_until <= NOW())
    THEN RAISE EXCEPTION 'promo_expired'; END IF;
    IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit
    THEN RAISE EXCEPTION 'promo_usage_limit'; END IF;

    IF v_promo.per_customer_limit IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_customer_usage
      FROM public.promo_code_redemptions
      WHERE promo_code_id = v_promo.id
        AND customer_email = lower(btrim(p_customer_email))::CITEXT;
      IF v_customer_usage >= v_promo.per_customer_limit
      THEN RAISE EXCEPTION 'promo_customer_limit'; END IF;
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'invalid_cart_item'; END;

    IF v_quantity < 1 OR v_quantity > 20 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_product_id AND status = 'active' AND archived_at IS NULL
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    IF v_product.product_type = 'unique' AND v_quantity <> 1
    THEN RAISE EXCEPTION 'unique_product_quantity_must_be_one'; END IF;

    v_unit_price := CASE
      WHEN v_product.price_promo IS NOT NULL
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

  IF v_total_quantity > 50 THEN RAISE EXCEPTION 'total_quantity_limit_exceeded'; END IF;

  IF v_promo_code <> '' THEN
    IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount
    THEN RAISE EXCEPTION 'promo_minimum_not_met'; END IF;
    IF v_eligible_subtotal <= 0 THEN RAISE EXCEPTION 'promo_not_applicable'; END IF;

    IF v_promo.discount_type = 'percentage' THEN
      v_discount := floor(v_eligible_subtotal * v_promo.discount_value / 100)::BIGINT;
    ELSE
      v_discount := v_promo.discount_value::BIGINT;
    END IF;
    IF v_promo.max_discount_amount IS NOT NULL
    THEN v_discount := LEAST(v_discount, v_promo.max_discount_amount); END IF;
    v_discount := LEAST(v_discount, v_eligible_subtotal, v_subtotal);
    IF v_discount <= 0 THEN RAISE EXCEPTION 'promo_zero_discount'; END IF;
  END IF;

  v_order_number := 'RS-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));
  v_access_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + make_interval(mins => v_payment_window);

  INSERT INTO public.orders (
    order_number, access_token, customer_email, subtotal, discount_amount,
    payment_fee, total_amount, status, payment_status, delivery_status,
    reservation_expires_at, promo_code_id, internal_notes
  ) VALUES (
    v_order_number, v_access_token, lower(btrim(p_customer_email))::CITEXT,
    v_subtotal, v_discount, 0, v_subtotal - v_discount,
    'pending', 'pending', 'pending', v_expires_at,
    CASE WHEN v_promo_code = '' THEN NULL ELSE v_promo.id END,
    'PUBLIC CHECKOUT V2'
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT * INTO v_product FROM public.products WHERE id = v_product_id FOR SHARE;
    v_unit_price := CASE
      WHEN v_product.price_promo IS NOT NULL
       AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo ELSE v_product.price_normal END;
    v_line_total := v_unit_price * v_quantity;

    SELECT COALESCE(jsonb_object_agg(pa.attribute_key, pa.attribute_value ORDER BY pa.display_order), '{}'::JSONB)
    INTO v_attributes FROM public.product_attributes pa WHERE pa.product_id = v_product_id;

    INSERT INTO public.order_items (
      order_id, product_id, quantity, unit_price, line_total,
      product_name_snapshot, product_attributes_snapshot
    ) VALUES (
      v_order_id, v_product_id, v_quantity, v_unit_price, v_line_total,
      v_product.name, v_attributes
    ) RETURNING id INTO v_order_item_id;

    v_reserved_count := public.reserve_stock_for_order(
      v_order_id, v_product_id, v_quantity, v_payment_window
    );
    IF v_reserved_count <> v_quantity THEN RAISE EXCEPTION 'reservation_count_mismatch'; END IF;
  END LOOP;

  IF v_promo_code <> '' THEN
    INSERT INTO public.promo_code_redemptions (
      promo_code_id, order_id, customer_email, discount_applied
    ) VALUES (
      v_promo.id, v_order_id, lower(btrim(p_customer_email))::CITEXT, v_discount
    );
    UPDATE public.promo_codes SET usage_count = usage_count + 1 WHERE id = v_promo.id;
  END IF;

  INSERT INTO public.payments (
    order_id, provider, payment_method, amount, fee, status, expired_at, provider_payload
  ) VALUES (
    v_order_id, 'pending_gateway', 'not_selected', v_subtotal - v_discount,
    0, 'pending', v_expires_at,
    jsonb_build_object('source', 'public_checkout_v2', 'gateway_connected', FALSE, 'payment_window_minutes', v_payment_window)
  );

  RETURN jsonb_build_object(
    'ok', TRUE, 'order_id', v_order_id, 'order_number', v_order_number,
    'access_token', v_access_token, 'subtotal', v_subtotal,
    'discount_amount', v_discount, 'total_amount', v_subtotal - v_discount,
    'promo_code', NULLIF(v_promo_code, ''),
    'reservation_expires_at', v_expires_at, 'payment_window_minutes', v_payment_window
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_checkout_order_v2(TEXT, JSONB, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_checkout_order_v2(TEXT, JSONB, TEXT, INTEGER)
TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_checkout_status(
  p_access_token TEXT
)
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
  IF p_access_token IS NULL OR length(btrim(p_access_token)) < 32 OR length(btrim(p_access_token)) > 256
  THEN RETURN jsonb_build_object('ok', FALSE, 'state', 'not_found'); END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE access_token = btrim(p_access_token)
    AND internal_notes IN ('PUBLIC CHECKOUT V1', 'PUBLIC CHECKOUT V2')
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
    WHEN v_order.payment_status IN ('failed', 'cancelled') THEN 'failed'
    ELSE 'awaiting_payment' END;

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
GRANT EXECUTE ON FUNCTION public.get_public_checkout_status(TEXT)
TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
