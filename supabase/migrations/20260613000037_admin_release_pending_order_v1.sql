-- =============================================================================
-- RIKU STORE — Admin release pending order V1
-- Run AFTER 20260613000036_catalog_search_and_copy_cleanup_v1.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_release_pending_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'admin_released_pending_order'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_released_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.payment_status = 'paid'
     OR v_order.status IN ('paid', 'delivered', 'refunded')
     OR v_order.delivery_status = 'delivered' THEN
    RAISE EXCEPTION 'paid_or_delivered_order_cannot_be_released';
  END IF;

  IF v_order.status = 'expired' AND v_order.payment_status = 'expired' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'released_count', 0,
      'order_id', v_order.id
    );
  END IF;

  v_released_count := public.release_stock_reservations(
    v_order.id,
    COALESCE(NULLIF(BTRIM(p_reason), ''), 'admin_released_pending_order')
  );

  UPDATE public.orders
  SET
    status = 'expired',
    payment_status = 'expired',
    delivery_status = CASE
      WHEN delivery_status = 'delivered' THEN delivery_status
      ELSE 'pending'
    END,
    reservation_expires_at = LEAST(COALESCE(reservation_expires_at, NOW()), NOW()),
    updated_at = NOW(),
    internal_notes = CONCAT_WS(
      E'\n',
      NULLIF(internal_notes, ''),
      'Order pending dibatalkan admin dan stok dikembalikan pada ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS TZ')
    )
  WHERE id = v_order.id;

  UPDATE public.payments
  SET
    status = 'expired',
    expired_at = COALESCE(expired_at, NOW()),
    updated_at = NOW()
  WHERE order_id = v_order.id
    AND status IN ('pending', 'processing');

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  VALUES (
    auth.uid(),
    'release_pending_order',
    'order',
    v_order.id,
    jsonb_build_object(
      'status', v_order.status,
      'payment_status', v_order.payment_status
    ),
    jsonb_build_object(
      'status', 'expired',
      'payment_status', 'expired',
      'released_stock_count', v_released_count
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_processed', false,
    'released_count', v_released_count,
    'order_id', v_order.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_release_pending_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_release_pending_order(UUID, TEXT) TO authenticated;

COMMIT;
