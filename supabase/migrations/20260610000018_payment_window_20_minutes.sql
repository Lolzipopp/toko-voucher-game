-- =============================================================================
-- RIKU STORE — 20-minute payment window + public payment status + auto-expiry
-- Run AFTER 20260610000017_public_cart_checkout_reservation.sql
-- =============================================================================

BEGIN;

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
  v_payment_minutes CONSTANT INTEGER := 20;
BEGIN
  -- Clean up expired public checkouts before taking fresh stock.
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
    NOW() + make_interval(mins => v_payment_minutes);

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
      jsonb_object_agg(
        pa.attribute_key,
        pa.attribute_value
        ORDER BY pa.display_order
      ),
      '{}'::JSONB
    )
      INTO v_attributes
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
      v_payment_minutes
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
      'gateway_connected', FALSE,
      'payment_window_minutes', v_payment_minutes
    )
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'total_amount', v_subtotal,
    'reservation_expires_at', v_reservation_expires_at,
    'payment_window_minutes', v_payment_minutes
  );
END;
$$;

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
BEGIN
  IF p_access_token IS NULL
     OR length(btrim(p_access_token)) < 32
     OR length(btrim(p_access_token)) > 256 THEN
    RETURN jsonb_build_object('ok', FALSE, 'state', 'not_found');
  END IF;

  SELECT *
    INTO v_order
  FROM public.orders
  WHERE access_token = btrim(p_access_token)
    AND internal_notes IN ('PUBLIC CHECKOUT V1', 'PUBLIC CHECKOUT V2')
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'state', 'not_found');
  END IF;

  IF v_order.payment_status IN ('pending', 'processing')
     AND v_order.status IN ('pending', 'processing')
     AND v_order.reservation_expires_at IS NOT NULL
     AND v_order.reservation_expires_at <= NOW() THEN

    v_released_count := public.release_stock_reservations(
      v_order.id,
      'public_checkout_expired'
    );

    UPDATE public.orders
    SET
      status = 'expired',
      payment_status = 'expired',
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;

    UPDATE public.payments
    SET
      status = 'expired',
      expired_at = COALESCE(expired_at, NOW()),
      updated_at = NOW()
    WHERE order_id = v_order.id
      AND status IN ('pending', 'processing');
  END IF;

  v_state := CASE
    WHEN v_order.payment_status = 'paid'
     AND v_order.delivery_status = 'delivered'
      THEN 'delivered'
    WHEN v_order.payment_status = 'paid'
      THEN 'paid'
    WHEN v_order.status = 'expired'
      OR v_order.payment_status = 'expired'
      THEN 'expired'
    WHEN v_order.payment_status = 'failed'
      THEN 'failed'
    ELSE 'awaiting_payment'
  END;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'state', v_state,
    'order_number', v_order.order_number,
    'total_amount', v_order.total_amount,
    'order_status', v_order.status,
    'payment_status', v_order.payment_status,
    'delivery_status', v_order.delivery_status,
    'payment_expires_at', v_order.reservation_expires_at,
    'released_stock_count', v_released_count,
    'server_now', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_checkout_status(TEXT)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_checkout_status(TEXT)
TO anon, authenticated, service_role;

-- Best-effort background expiry every minute when pg_cron is enabled.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'rikustore-expire-public-checkouts'
    ) THEN
      PERFORM cron.schedule(
        'rikustore-expire-public-checkouts',
        '* * * * *',
        'SELECT public.release_expired_public_checkout_orders();'
      );
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
