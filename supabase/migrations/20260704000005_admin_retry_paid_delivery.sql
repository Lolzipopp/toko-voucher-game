-- =============================================================================
-- RIKU STORE — Admin retry paid order delivery
-- Explicit recovery RPC for paid orders with delivery_failed.
-- It checks stock per ordered product, returns clear shortage reason, and only
-- marks delivered after all required accounts are linked/sold.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_retry_paid_order_delivery(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_inventory RECORD;
  v_existing_count INTEGER := 0;
  v_available_count INTEGER := 0;
  v_needed INTEGER := 0;
  v_item_delivered_count INTEGER := 0;
  v_total_delivered_count INTEGER := 0;
  v_warranty_days INTEGER := 3;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'order_not_found');
  END IF;

  IF v_order.payment_status <> 'paid' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'order_not_paid', 'payment_status', v_order.payment_status);
  END IF;

  IF v_order.delivery_status = 'delivered' THEN
    SELECT COUNT(*)::INTEGER INTO v_total_delivered_count
    FROM public.order_item_inventory oii
    JOIN public.order_items oi ON oi.id = oii.order_item_id
    WHERE oi.order_id = p_order_id;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'already_delivered', TRUE,
      'delivered_count', v_total_delivered_count
    );
  END IF;

  FOR v_item IN
    SELECT
      oi.id AS order_item_id,
      oi.product_id,
      oi.product_name_snapshot,
      oi.quantity,
      COALESCE(p.warranty_days, 3) AS warranty_days
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.created_at
  LOOP
    SELECT COUNT(*)::INTEGER INTO v_existing_count
    FROM public.order_item_inventory
    WHERE order_item_id = v_item.order_item_id;

    v_needed := GREATEST(v_item.quantity - v_existing_count, 0);
    v_item_delivered_count := 0;
    v_warranty_days := GREATEST(v_warranty_days, v_item.warranty_days);

    IF v_needed = 0 THEN
      v_total_delivered_count := v_total_delivered_count + v_existing_count;
      CONTINUE;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_available_count
    FROM public.inventory_accounts ia
    WHERE ia.product_id = v_item.product_id
      AND ia.status = 'available'
      AND ia.archived_at IS NULL;

    IF v_available_count < v_needed THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'reason', 'insufficient_available_stock_for_order_product',
        'product_id', v_item.product_id,
        'product_name', v_item.product_name_snapshot,
        'needed', v_needed,
        'available', v_available_count
      );
    END IF;

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
      SET
        status = 'sold',
        sold_at = NOW(),
        updated_at = NOW()
      WHERE id = v_inventory.id
        AND status = 'available';

      IF FOUND THEN
        v_item_delivered_count := v_item_delivered_count + 1;
      END IF;
    END LOOP;

    IF v_item_delivered_count < v_needed THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'reason', 'stock_locked_by_other_process',
        'product_id', v_item.product_id,
        'product_name', v_item.product_name_snapshot,
        'needed', v_needed,
        'delivered_now', v_item_delivered_count
      );
    END IF;

    v_total_delivered_count := v_total_delivered_count + v_existing_count + v_item_delivered_count;
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

  RETURN jsonb_build_object(
    'ok', TRUE,
    'already_delivered', FALSE,
    'delivered_count', v_total_delivered_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_retry_paid_order_delivery(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_retry_paid_order_delivery(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
