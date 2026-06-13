BEGIN;

CREATE OR REPLACE FUNCTION public.admin_restore_product(p_product_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_old public.products%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_old
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found';
  END IF;

  IF v_old.archived_at IS NULL AND v_old.status <> 'archived' THEN
    RETURN p_product_id;
  END IF;

  UPDATE public.products
  SET status = 'draft', archived_at = NULL, updated_at = now()
  WHERE id = p_product_id;

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    auth.uid(), 'product.restore', 'product', p_product_id,
    jsonb_build_object('status', v_old.status, 'archived_at', v_old.archived_at),
    jsonb_build_object('status', 'draft', 'archived_at', NULL)
  );

  RETURN p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_product(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_product(UUID) TO authenticated, service_role;

COMMIT;
