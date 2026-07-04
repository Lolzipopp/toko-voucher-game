-- =============================================================================
-- RIKU STORE — Checkout email pending order guard
-- If the same email has an unpaid public order, UI can warn customer before
-- replacing/cancelling previous unpaid checkout.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_pending_checkout_by_email(
  p_customer_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_email CITEXT := lower(btrim(COALESCE(p_customer_email, '')))::CITEXT;
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_email::TEXT = '' OR length(v_email::TEXT) > 254 THEN
    RETURN jsonb_build_object('ok', FALSE, 'has_pending', FALSE);
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE customer_email = v_email
    AND order_source = 'public'
    AND payment_status = 'pending'
    AND status = 'pending'
    AND reservation_expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_pending', FALSE);
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'has_pending', TRUE,
    'order_number', v_order.order_number,
    'total_amount', v_order.total_amount,
    'payment_expires_at', v_order.reservation_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_public_pending_checkout_by_email(
  p_customer_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_email CITEXT := lower(btrim(COALESCE(p_customer_email, '')))::CITEXT;
  v_cancelled_count INTEGER := 0;
BEGIN
  IF v_email::TEXT = '' OR length(v_email::TEXT) > 254 THEN
    RETURN jsonb_build_object('ok', FALSE, 'cancelled_count', 0);
  END IF;

  WITH target_orders AS (
    SELECT id
    FROM public.orders
    WHERE customer_email = v_email
      AND order_source = 'public'
      AND payment_status = 'pending'
      AND status = 'pending'
      AND reservation_expires_at > NOW()
    FOR UPDATE
  ), updated_orders AS (
    UPDATE public.orders o
    SET
      status = 'expired',
      payment_status = 'expired',
      delivery_status = 'pending',
      internal_notes = concat_ws(E'\n', NULLIF(o.internal_notes, ''), 'Expired: customer started a new checkout with the same email.'),
      updated_at = NOW()
    FROM target_orders t
    WHERE o.id = t.id
    RETURNING o.id
  ), updated_payments AS (
    UPDATE public.payments p
    SET
      status = 'expired',
      expired_at = COALESCE(expired_at, NOW()),
      updated_at = NOW()
    FROM updated_orders u
    WHERE p.order_id = u.id
      AND p.status = 'pending'
    RETURNING p.id
  )
  SELECT COUNT(*)::INTEGER INTO v_cancelled_count FROM updated_orders;

  RETURN jsonb_build_object('ok', TRUE, 'cancelled_count', v_cancelled_count);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_pending_checkout_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pending_checkout_by_email(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancel_public_pending_checkout_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_pending_checkout_by_email(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
