-- =============================================================================
-- RIKU STORE — Public cart checkout + transactional FIFO reservation V1
-- Run AFTER 20260609000016_email_catalog_product_detail.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.release_expired_public_checkout_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_order_count INTEGER := 0;
  v_stock_count INTEGER := 0;
  v_released INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT o.id
    FROM public.orders o
    WHERE o.internal_notes = 'PUBLIC CHECKOUT V1'
      AND o.status IN ('pending', 'processing')
      AND o.payment_status IN ('pending', 'processing')
      AND o.reservation_expires_at IS NOT NULL
      AND o.reservation_expires_at <= NOW()
    ORDER BY o.reservation_expires_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_released := public.release_stock_reservations(
      v_order.id,
      'public_checkout_expired'
    );

    UPDATE public.orders
    SET
      status = 'expired',
      payment_status = 'expired',
      updated_at = NOW()
    WHERE id = v_order.id;

    UPDATE public.payments
    SET
      status = 'expired',
      expired_at = COALESCE(expired_at, NOW()),
      updated_at = NOW()
    WHERE order_id = v_order.id
      AND status IN ('pending', 'processing');

    v_order_count := v_order_count + 1;
    v_stock_count := v_stock_count + v_released;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_order_count', v_order_count,
    'released_stock_count', v_stock_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_public_checkout_orders()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.release_expired_public_checkout_orders()
TO service_role;

CREATE OR REPLACE FUNCTION public.create_public_checkout_order(
  p_customer_email TEXT,
  p_items JSONB,
  p_reservation_minutes INTEGER DEFAULT 20
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
  v_reservation_expires_at TIMESTAMPTZ;
  v_subtotal BIGINT := 0;
  v_total_quantity INTEGER := 0;
  v_item_count INTEGER := 0;
  v_item JSONB;
  v_product public.products%ROWTYPE;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price BIGINT;
  v_line_total BIGINT;
  v_attributes JSONB;
  v_reserved_count INTEGER;
BEGIN
  -- Opportunistic cleanup keeps expired test-free checkout stock reusable.
  PERFORM public.release_expired_public_checkout_orders();

  IF NULLIF(btrim(p_customer_email), '') IS NULL
     OR length(btrim(p_customer_email)) > 254
     OR btrim(p_customer_email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'invalid_customer_email';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items_must_be_array';
  END IF;

  v_item_count := jsonb_array_length(p_items);

  IF v_item_count < 1 OR v_item_count > 20 THEN
    RAISE EXCEPTION 'item_count_must_be_between_1_and_20';
  END IF;

  IF p_reservation_minutes IS NULL
     OR p_reservation_minutes < 5
     OR p_reservation_minutes > 30 THEN
    RAISE EXCEPTION 'reservation_minutes_must_be_between_5_and_30';
  END IF;

  -- Validate duplicate product IDs before creating any rows.
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value->>'product_id' AS product_id, COUNT(*)
      FROM jsonb_array_elements(p_items)
      GROUP BY value->>'product_id'
      HAVING COUNT(*) > 1
    ) duplicated
  ) THEN
    RAISE EXCEPTION 'duplicate_product_in_cart';
  END IF;

  v_order_number :=
    'RS-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));
  v_access_token := encode(gen_random_bytes(32), 'hex');
  v_reservation_expires_at :=
    NOW() + make_interval(mins => p_reservation_minutes);

  -- Calculate totals from trusted database prices.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_cart_item';
    END;

    IF v_quantity < 1 OR v_quantity > 20 THEN
      RAISE EXCEPTION 'quantity_must_be_between_1_and_20';
    END IF;

    SELECT *
      INTO v_product
    FROM public.products
    WHERE id = v_product_id
      AND status = 'active'
      AND archived_at IS NULL
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_unavailable: %', v_product_id;
    END IF;

    IF v_product.product_type = 'unique' AND v_quantity <> 1 THEN
      RAISE EXCEPTION 'unique_product_quantity_must_be_one';
    END IF;

    v_unit_price := CASE
      WHEN v_product.price_promo IS NOT NULL
       AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo
      ELSE v_product.price_normal
    END;

    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_quantity := v_total_quantity + v_quantity;
  END LOOP;

  IF v_total_quantity > 50 THEN
    RAISE EXCEPTION 'total_quantity_limit_exceeded';
  END IF;

  INSERT INTO public.orders (
    order_number,
    access_token,
    customer_email,
    subtotal,
    discount_amount,
    payment_fee,
    total_amount,
    status,
    payment_status,
    delivery_status,
    reservation_expires_at,
    internal_notes
  ) VALUES (
    v_order_number,
    v_access_token,
    lower(btrim(p_customer_email))::CITEXT,
    v_subtotal,
    0,
    0,
    v_subtotal,
    'pending',
    'pending',
    'pending',
    v_reservation_expires_at,
    'PUBLIC CHECKOUT V1'
  ) RETURNING id INTO v_order_id;

  -- Insert line items and reserve FIFO stock atomically.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT *
      INTO v_product
    FROM public.products
    WHERE id = v_product_id
      AND status = 'active'
      AND archived_at IS NULL
    FOR SHARE;

    v_unit_price := CASE
      WHEN v_product.price_promo IS NOT NULL
       AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo
      ELSE v_product.price_normal
    END;
    v_line_total := v_unit_price * v_quantity;

    SELECT COALESCE(
      jsonb_object_agg(pa.attribute_key, pa.attribute_value ORDER BY pa.display_order),
      '{}'::JSONB
    ) INTO v_attributes
    FROM public.product_attributes pa
    WHERE pa.product_id = v_product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      line_total,
      product_name_snapshot,
      product_attributes_snapshot
    ) VALUES (
      v_order_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_line_total,
      v_product.name,
      v_attributes
    ) RETURNING id INTO v_order_item_id;

    v_reserved_count := public.reserve_stock_for_order(
      v_order_id,
      v_product_id,
      v_quantity,
      p_reservation_minutes
    );

    IF v_reserved_count <> v_quantity THEN
      RAISE EXCEPTION 'reservation_count_mismatch';
    END IF;
  END LOOP;

  INSERT INTO public.payments (
    order_id,
    provider,
    payment_method,
    amount,
    fee,
    status,
    expired_at,
    provider_payload
  ) VALUES (
    v_order_id,
    'pending_gateway',
    'not_selected',
    v_subtotal,
    0,
    'pending',
    v_reservation_expires_at,
    jsonb_build_object(
      'source', 'public_checkout_v1',
      'gateway_connected', FALSE
    )
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'total_amount', v_subtotal,
    'reservation_expires_at', v_reservation_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_checkout_order(TEXT, JSONB, INTEGER)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_public_checkout_order(TEXT, JSONB, INTEGER)
TO anon, authenticated, service_role;

COMMIT;
