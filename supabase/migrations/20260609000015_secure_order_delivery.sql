-- =============================================================================
-- RIKU STORE — Secure customer order delivery by secret access token
-- Run AFTER 20260609000014_simulate_test_paid_delivery.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.decrypt_credential(
  p_ciphertext TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT extensions.pgp_sym_decrypt(
    decode(p_ciphertext, 'base64'),
    public.get_encryption_key()
  );
$$;

REVOKE ALL ON FUNCTION public.decrypt_credential(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.decrypt_credential(TEXT)
TO service_role;

CREATE OR REPLACE FUNCTION public.get_order_delivery_by_token(
  p_access_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items JSONB;
BEGIN
  IF p_access_token IS NULL
     OR length(btrim(p_access_token)) < 32
     OR length(btrim(p_access_token)) > 256 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'state', 'not_found'
    );
  END IF;

  SELECT *
    INTO v_order
  FROM public.orders
  WHERE access_token = btrim(p_access_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'state', 'not_found'
    );
  END IF;

  IF v_order.payment_status <> 'paid'
     OR v_order.delivery_status <> 'delivered'
     OR v_order.delivered_at IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'state', 'not_ready',
      'order_number', v_order.order_number,
      'payment_status', v_order.payment_status,
      'delivery_status', v_order.delivery_status
    );
  END IF;

  IF v_order.credentials_hidden_at IS NULL
     OR v_order.credentials_hidden_at <= NOW() THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'state', 'hidden',
      'order_number', v_order.order_number,
      'delivered_at', v_order.delivered_at,
      'credentials_hidden_at', v_order.credentials_hidden_at,
      'warranty_ends_at', v_order.warranty_ends_at
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'order_item_id', oi.id,
        'product_name', oi.product_name_snapshot,
        'product_attributes', oi.product_attributes_snapshot,
        'unit_price', oi.unit_price,
        'credentials',
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'inventory_id', ia.id,
                'username', public.decrypt_credential(
                  ia.account_username_encrypted
                ),
                'password', public.decrypt_credential(
                  ia.account_password_encrypted
                ),
                'delivered_at', oii.delivered_at
              )
              ORDER BY oii.created_at
            )
            FROM public.order_item_inventory oii
            JOIN public.inventory_accounts ia
              ON ia.id = oii.inventory_account_id
            WHERE oii.order_item_id = oi.id
          ),
          '[]'::JSONB
        )
      )
      ORDER BY oi.created_at
    ),
    '[]'::JSONB
  )
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'state', 'available',
    'order_number', v_order.order_number,
    'customer_email', v_order.customer_email,
    'total_amount', v_order.total_amount,
    'payment_status', v_order.payment_status,
    'delivery_status', v_order.delivery_status,
    'paid_at', v_order.paid_at,
    'delivered_at', v_order.delivered_at,
    'credentials_hidden_at', v_order.credentials_hidden_at,
    'warranty_ends_at', v_order.warranty_ends_at,
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_delivery_by_token(TEXT)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_order_delivery_by_token(TEXT)
TO anon, authenticated, service_role;

COMMIT;
