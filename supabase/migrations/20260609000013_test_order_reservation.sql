-- =============================================================================
-- RIKU STORE — Internal test order + 20 minute reservation tools
-- Admin-only. No payment gateway and no public checkout.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_create_test_order(
  p_product_id UUID,
  p_quantity INTEGER,
  p_customer_email TEXT DEFAULT 'test-order@rikustore.local',
  p_reservation_minutes INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number TEXT;
  v_access_token TEXT;
  v_unit_price BIGINT;
  v_line_total BIGINT;
  v_reserved_count INTEGER;
  v_reservation_expires_at TIMESTAMPTZ;
  v_attributes JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN
    RAISE EXCEPTION 'quantity must be between 1 and 50';
  END IF;

  IF p_reservation_minutes IS NULL OR p_reservation_minutes < 1 OR p_reservation_minutes > 60 THEN
    RAISE EXCEPTION 'reservation minutes must be between 1 and 60';
  END IF;

  IF NULLIF(btrim(p_customer_email), '') IS NULL THEN
    RAISE EXCEPTION 'customer email is required';
  END IF;

  SELECT *
    INTO v_product
  FROM public.products
  WHERE id = p_product_id
    AND status = 'active'
    AND archived_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active product not found';
  END IF;

  v_unit_price := CASE
    WHEN v_product.price_promo IS NOT NULL
      AND (v_product.promo_ends_at IS NULL OR v_product.promo_ends_at > NOW())
      THEN v_product.price_promo
    ELSE v_product.price_normal
  END;

  v_line_total := v_unit_price * p_quantity;
  v_reservation_expires_at := NOW() + make_interval(mins => p_reservation_minutes);
  v_order_number := 'TEST-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS-MS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  v_access_token := encode(gen_random_bytes(32), 'hex');

  SELECT COALESCE(
    jsonb_object_agg(pa.attribute_key, pa.attribute_value ORDER BY pa.display_order),
    '{}'::JSONB
  )
  INTO v_attributes
  FROM public.product_attributes pa
  WHERE pa.product_id = p_product_id;

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
    v_line_total,
    0,
    0,
    v_line_total,
    'pending',
    'pending',
    'pending',
    v_reservation_expires_at,
    'INTERNAL TEST ORDER — not a real customer transaction'
  )
  RETURNING id INTO v_order_id;

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
    p_product_id,
    p_quantity,
    v_unit_price,
    v_line_total,
    v_product.name,
    v_attributes
  )
  RETURNING id INTO v_order_item_id;

  -- Existing function uses FIFO + FOR UPDATE SKIP LOCKED and raises on shortage.
  -- Any error rolls back the order, item, payment, and partial reservations together.
  v_reserved_count := public.reserve_stock_for_order(
    v_order_id,
    p_product_id,
    p_quantity,
    p_reservation_minutes
  );

  INSERT INTO public.payments (
    order_id,
    provider,
    payment_method,
    external_id,
    amount,
    fee,
    status,
    expired_at,
    provider_payload
  ) VALUES (
    v_order_id,
    'internal_test',
    'dummy',
    'TEST-' || v_order_id::TEXT,
    v_line_total,
    0,
    'pending',
    v_reservation_expires_at,
    jsonb_build_object('is_test', TRUE)
  );

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    entity_type,
    entity_id,
    new_values
  ) VALUES (
    auth.uid(),
    'order.test_create_and_reserve',
    'order',
    v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'product_id', p_product_id,
      'quantity', p_quantity,
      'reserved_count', v_reserved_count,
      'reservation_expires_at', v_reservation_expires_at,
      'is_test', TRUE
    )
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'reserved_count', v_reserved_count,
    'reservation_expires_at', v_reservation_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_release_expired_test_orders()
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  FOR v_order IN
    SELECT o.id
    FROM public.orders o
    WHERE o.internal_notes = 'INTERNAL TEST ORDER — not a real customer transaction'
      AND o.status IN ('pending', 'processing')
      AND o.payment_status IN ('pending', 'processing')
      AND o.reservation_expires_at IS NOT NULL
      AND o.reservation_expires_at <= NOW()
    ORDER BY o.reservation_expires_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_released := public.release_stock_reservations(
      v_order.id,
      'test_reservation_expired'
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

  IF v_order_count > 0 THEN
    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      action,
      entity_type,
      new_values
    ) VALUES (
      auth.uid(),
      'order.test_release_expired',
      'order_batch',
      jsonb_build_object(
        'expired_order_count', v_order_count,
        'released_stock_count', v_stock_count
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'expired_order_count', v_order_count,
    'released_stock_count', v_stock_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_test_order(UUID, INTEGER, TEXT, INTEGER)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_release_expired_test_orders()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_test_order(UUID, INTEGER, TEXT, INTEGER)
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_release_expired_test_orders()
TO authenticated, service_role;

COMMIT;
