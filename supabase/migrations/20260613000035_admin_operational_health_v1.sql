-- =============================================================================
-- RIKU STORE — Admin operational health metrics V1
-- Run AFTER 20260613000034_admin_dashboard_metrics_v1.sql
-- =============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS stock_reservations_active_expiry_idx
  ON public.stock_reservations (reserved_until)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS order_email_deliveries_failed_created_idx
  ON public.order_email_deliveries (created_at DESC)
  WHERE status = 'failed';

CREATE OR REPLACE FUNCTION public.admin_operational_health()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT CASE
    WHEN NOT public.is_admin() THEN
      jsonb_build_object('authorized', false)
    ELSE
      jsonb_build_object(
        'authorized', true,
        'checked_at', NOW(),
        'overdue_active_reservations', (
          SELECT COUNT(*)::INTEGER
          FROM public.stock_reservations sr
          WHERE sr.released_at IS NULL
            AND sr.reserved_until <= NOW()
        ),
        'expired_orders_not_released', (
          SELECT COUNT(*)::INTEGER
          FROM public.orders o
          WHERE o.status IN ('pending', 'processing')
            AND o.payment_status IN ('pending', 'processing')
            AND o.reservation_expires_at IS NOT NULL
            AND o.reservation_expires_at <= NOW()
        ),
        'delivery_failed_orders', (
          SELECT COUNT(*)::INTEGER
          FROM public.orders o
          WHERE o.delivery_status = 'delivery_failed'
        ),
        'failed_emails_24h', (
          SELECT COUNT(*)::INTEGER
          FROM public.order_email_deliveries oed
          WHERE oed.status = 'failed'
            AND oed.created_at >= NOW() - INTERVAL '24 hours'
        ),
        'problem_stock', (
          SELECT COUNT(*)::INTEGER
          FROM public.inventory_accounts ia
          WHERE ia.status = 'problem'
            AND ia.archived_at IS NULL
        ),
        'active_products_without_stock', (
          SELECT COUNT(*)::INTEGER
          FROM public.products p
          WHERE p.status = 'active'
            AND p.archived_at IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM public.inventory_accounts ia
              WHERE ia.product_id = p.id
                AND ia.status = 'available'
                AND ia.archived_at IS NULL
            )
        )
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.admin_operational_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_operational_health() TO authenticated;

COMMIT;
