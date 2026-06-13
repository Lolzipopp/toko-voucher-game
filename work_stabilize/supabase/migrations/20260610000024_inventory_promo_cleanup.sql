-- =============================================================================
-- RIKU STORE — Inventory expiry repair + promo separation + stock hard delete
-- Run AFTER 20260610000023_payment_infrastructure_v1.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.repair_expired_stock_reservations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_inventory_ids UUID[] := ARRAY[]::UUID[];
  v_order_ids UUID[] := ARRAY[]::UUID[];
  v_released_reservations INTEGER := 0;
  v_released_inventory INTEGER := 0;
  v_expired_orders INTEGER := 0;
BEGIN
  IF NOT (
    public.is_admin()
    OR current_user IN ('postgres', 'service_role', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH released AS (
    UPDATE public.stock_reservations
    SET
      released_at = COALESCE(released_at, NOW()),
      release_reason = COALESCE(release_reason, 'reservation_expired')
    WHERE released_at IS NULL
      AND reserved_until <= NOW()
    RETURNING inventory_account_id, order_id
  )
  SELECT
    COALESCE(array_agg(DISTINCT inventory_account_id), ARRAY[]::UUID[]),
    COALESCE(array_agg(DISTINCT order_id), ARRAY[]::UUID[]),
    COUNT(*)::INTEGER
  INTO
    v_inventory_ids,
    v_order_ids,
    v_released_reservations
  FROM released;

  UPDATE public.inventory_accounts ia
  SET
    status = 'available',
    updated_at = NOW()
  WHERE ia.status = 'reserved'
    AND ia.id = ANY(v_inventory_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.stock_reservations sr
      WHERE sr.inventory_account_id = ia.id
        AND sr.released_at IS NULL
        AND sr.reserved_until > NOW()
    );

  GET DIAGNOSTICS v_released_inventory = ROW_COUNT;

  UPDATE public.orders o
  SET
    status = 'expired',
    payment_status = 'expired',
    updated_at = NOW()
  WHERE o.id = ANY(v_order_ids)
    AND o.status IN ('pending', 'processing')
    AND o.payment_status IN ('pending', 'processing');

  GET DIAGNOSTICS v_expired_orders = ROW_COUNT;

  UPDATE public.payments p
  SET
    status = 'expired',
    expired_at = COALESCE(expired_at, NOW()),
    updated_at = NOW()
  WHERE p.order_id = ANY(v_order_ids)
    AND p.status IN ('pending', 'processing');

  RETURN jsonb_build_object(
    'released_reservations', v_released_reservations,
    'released_inventory', v_released_inventory,
    'expired_orders', v_expired_orders
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_public_checkout_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN public.repair_expired_stock_reservations();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_inventory_stock(
  p_inventory_ids UUID[],
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_row public.inventory_accounts%ROWTYPE;
  v_deleted INTEGER := 0;
  v_rejected INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_inventory_ids IS NULL OR cardinality(p_inventory_ids) = 0 THEN
    RAISE EXCEPTION 'no_inventory_selected';
  END IF;

  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'delete_reason_required';
  END IF;

  FOREACH v_id IN ARRAY p_inventory_ids
  LOOP
    SELECT *
      INTO v_row
    FROM public.inventory_accounts
    WHERE id = v_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_rejected := v_rejected + 1;
      CONTINUE;
    END IF;

    IF v_row.status IN ('reserved', 'sold') THEN
      v_rejected := v_rejected + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.stock_reservations sr
      WHERE sr.inventory_account_id = v_id
        AND sr.released_at IS NULL
    ) THEN
      v_rejected := v_rejected + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.order_item_inventory oii
      WHERE oii.inventory_account_id = v_id
    ) THEN
      v_rejected := v_rejected + 1;
      CONTINUE;
    END IF;

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
      'inventory.delete',
      'inventory_account',
      v_id,
      jsonb_build_object(
        'product_id', v_row.product_id,
        'status', v_row.status,
        'supplier', v_row.supplier,
        'purchase_cost', v_row.purchase_cost
      ),
      jsonb_build_object(
        'deleted', TRUE,
        'reason', btrim(p_reason)
      )
    );

    DELETE FROM public.inventory_accounts
    WHERE id = v_id;

    v_deleted := v_deleted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'deleted_count', v_deleted,
    'rejected_count', v_rejected
  );
END;
$$;

REVOKE ALL ON FUNCTION public.repair_expired_stock_reservations()
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.release_expired_public_checkout_orders()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_inventory_stock(UUID[], TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.repair_expired_stock_reservations()
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.release_expired_public_checkout_orders()
TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_delete_inventory_stock(UUID[], TEXT)
TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
