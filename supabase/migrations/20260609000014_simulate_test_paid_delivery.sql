-- =============================================================================
-- RIKU STORE — Internal test payment + auto-delivery simulation
-- Admin-only. No real payment gateway and no public checkout.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_simulate_test_paid_delivery(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_delivered_count INTEGER := 0;
  v_error_message TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.internal_notes IS DISTINCT FROM
    'INTERNAL TEST ORDER — not a real customer transaction' THEN
    RAISE EXCEPTION 'only_internal_test_orders_are_allowed';
  END IF;

  -- Idempotent repeat: do not sell or link the same inventory twice.
  IF v_order.payment_status = 'paid'
     AND v_order.delivery_status = 'delivered' THEN
    SELECT COUNT(*)::INTEGER
      INTO v_delivered_count
    FROM public.order_item_inventory oii
    JOIN public.order_items oi
      ON oi.id = oii.order_item_id
    WHERE oi.order_id = p_order_id;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'already_processed', TRUE,
      'order_id', p_order_id,
      'delivered_count', v_delivered_count,
      'message', 'Order was already paid and delivered'
    );
  END IF;

  IF v_order.status IN ('expired', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'order_status_not_payable: %', v_order.status;
  END IF;

  IF v_order.reservation_expires_at IS NULL
     OR v_order.reservation_expires_at < NOW() THEN
    RAISE EXCEPTION 'reservation_expired';
  END IF;

  SELECT *
    INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id
    AND provider = 'internal_test'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal_test_payment_not_found';
  END IF;

  -- Persist paid state before delivery attempt.
  UPDATE public.payments
  SET
    status = 'paid',
    paid_at = COALESCE(paid_at, NOW()),
    webhook_received_at = COALESCE(webhook_received_at, NOW()),
    webhook_idempotency_key = COALESCE(
      webhook_idempotency_key,
      'INTERNAL-TEST-PAID-' || p_order_id::TEXT
    ),
    provider_payload = provider_payload || jsonb_build_object(
      'simulated_paid', TRUE,
      'simulated_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = v_payment.id;

  UPDATE public.orders
  SET
    status = 'processing',
    payment_status = 'paid',
    delivery_status = 'processing',
    paid_at = COALESCE(paid_at, NOW()),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- This inner block is a subtransaction. If delivery fails, its partial
  -- inventory changes roll back while the paid state can still be preserved.
  BEGIN
    v_delivered_count := public.fulfill_order_delivery(p_order_id);

    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      action,
      entity_type,
      entity_id,
      new_values
    ) VALUES (
      auth.uid(),
      'order.test_simulate_paid_delivery',
      'order',
      p_order_id,
      jsonb_build_object(
        'payment_status', 'paid',
        'delivery_status', 'delivered',
        'delivered_count', v_delivered_count,
        'is_test', TRUE
      )
    );

    RETURN jsonb_build_object(
      'ok', TRUE,
      'already_processed', FALSE,
      'order_id', p_order_id,
      'delivered_count', v_delivered_count,
      'message', 'Test payment marked paid and delivery completed'
    );

  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;

      UPDATE public.orders
      SET
        status = 'paid',
        payment_status = 'paid',
        delivery_status = 'delivery_failed',
        paid_at = COALESCE(paid_at, NOW()),
        updated_at = NOW()
      WHERE id = p_order_id;

      INSERT INTO public.admin_audit_logs (
        admin_user_id,
        action,
        entity_type,
        entity_id,
        new_values
      ) VALUES (
        auth.uid(),
        'order.test_simulate_delivery_failed',
        'order',
        p_order_id,
        jsonb_build_object(
          'payment_status', 'paid',
          'delivery_status', 'delivery_failed',
          'error', v_error_message,
          'is_test', TRUE
        )
      );

      RETURN jsonb_build_object(
        'ok', FALSE,
        'already_processed', FALSE,
        'order_id', p_order_id,
        'delivered_count', 0,
        'message', v_error_message
      );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_simulate_test_paid_delivery(UUID)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_simulate_test_paid_delivery(UUID)
TO authenticated, service_role;

COMMIT;
