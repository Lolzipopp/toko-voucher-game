BEGIN;

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS TABLE (
  active_products BIGINT,
  available_stock BIGINT,
  reserved_stock BIGINT,
  problem_stock BIGINT,
  pending_orders BIGINT,
  delivery_failed_orders BIGINT,
  paid_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.products WHERE status = 'active' AND archived_at IS NULL),
    (SELECT COUNT(*) FROM public.inventory_accounts WHERE status = 'available' AND archived_at IS NULL),
    (SELECT COUNT(*) FROM public.inventory_accounts WHERE status = 'reserved' AND archived_at IS NULL),
    (SELECT COUNT(*) FROM public.inventory_accounts WHERE status = 'problem' AND archived_at IS NULL),
    (SELECT COUNT(*) FROM public.orders WHERE status IN ('pending', 'processing')),
    (SELECT COUNT(*) FROM public.orders WHERE delivery_status = 'delivery_failed'),
    COALESCE((SELECT SUM(total_amount) FROM public.orders WHERE payment_status = 'paid'), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status_created_at ON public.orders (delivery_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_status_created_at ON public.inventory_accounts (status, created_at DESC) WHERE archived_at IS NULL;

COMMIT;
