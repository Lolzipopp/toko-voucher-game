-- =============================================================================
-- RIKU STORE — Telegram launch finalizer
-- Adds a reliable single-account encrypted inventory import RPC used by the
-- local Telegram import tool. Safe to rerun.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_import_single_inventory_stock(
  p_product_id UUID,
  p_username TEXT,
  p_password TEXT,
  p_purchase_cost BIGINT DEFAULT 0,
  p_supplier TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_inventory_id UUID;
  v_hash_column TEXT;
  v_hash_type TEXT;
  v_sql TEXT;
BEGIN
  IF NOT public.is_admin() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_product_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = p_product_id
      AND p.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF NULLIF(btrim(COALESCE(p_username, '')), '') IS NULL
     OR NULLIF(COALESCE(p_password, ''), '') IS NULL THEN
    RAISE EXCEPTION 'credential_required';
  END IF;

  IF p_purchase_cost IS NULL OR p_purchase_cost < 0 THEN
    RAISE EXCEPTION 'invalid_purchase_cost';
  END IF;

  -- Imported Telegram products are unique products. Never create a second
  -- inventory row for the same product through this repair RPC.
  IF EXISTS (
    SELECT 1 FROM public.inventory_accounts ia
    WHERE ia.product_id = p_product_id
      AND ia.archived_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'inserted_count', 0,
      'skipped_count', 1,
      'reason', 'product_already_has_inventory'
    );
  END IF;

  -- Older RIKU STORE schema revisions used different names/types for the
  -- deterministic username hash. Discover it instead of hard-coding it.
  SELECT c.column_name, c.udt_name
    INTO v_hash_column, v_hash_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'inventory_accounts'
    AND c.column_name <> 'account_username_encrypted'
    AND (
      c.column_name ILIKE '%username%hash%'
      OR c.column_name ILIKE '%username%fingerprint%'
    )
  ORDER BY CASE WHEN c.column_name = 'account_username_hash' THEN 0 ELSE 1 END
  LIMIT 1;

  v_sql :=
    'INSERT INTO public.inventory_accounts (' ||
    'product_id, account_username_encrypted, account_password_encrypted, ' ||
    'purchase_cost, supplier, notes, status';

  IF v_hash_column IS NOT NULL THEN
    v_sql := v_sql || ', ' || quote_ident(v_hash_column);
  END IF;

  v_sql := v_sql || ') VALUES (' ||
    '$1, ' ||
    'encode(extensions.pgp_sym_encrypt(btrim($2), public.get_encryption_key()), ''base64''), ' ||
    'encode(extensions.pgp_sym_encrypt($3, public.get_encryption_key()), ''base64''), ' ||
    '$4, NULLIF(btrim($5), ''''), NULLIF(btrim($6), ''''), ''available''';

  IF v_hash_column IS NOT NULL THEN
    IF v_hash_type = 'bytea' THEN
      v_sql := v_sql || ', extensions.digest(lower(btrim($2)), ''sha256'')';
    ELSE
      v_sql := v_sql || ', encode(extensions.digest(lower(btrim($2)), ''sha256''), ''hex'')';
    END IF;
  END IF;

  v_sql := v_sql || ') RETURNING id';

  BEGIN
    EXECUTE v_sql
      INTO v_inventory_id
      USING p_product_id, p_username, p_password, p_purchase_cost,
            p_supplier, p_notes;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'inserted_count', 0,
        'skipped_count', 1,
        'reason', 'username_already_exists'
      );
  END;

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    entity_type,
    entity_id,
    new_values
  )
  VALUES (
    auth.uid(),
    'inventory.telegram_import',
    'inventory_account',
    v_inventory_id,
    jsonb_build_object(
      'product_id', p_product_id,
      'status', 'available',
      'supplier', NULLIF(btrim(COALESCE(p_supplier, '')), '')
    )
  );

  RETURN jsonb_build_object(
    'inserted_count', 1,
    'skipped_count', 0,
    'inventory_id', v_inventory_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_import_single_inventory_stock(
  UUID, TEXT, TEXT, BIGINT, TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_import_single_inventory_stock(
  UUID, TEXT, TEXT, BIGINT, TEXT, TEXT
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
