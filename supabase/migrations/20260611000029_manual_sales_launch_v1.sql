-- =============================================================================
-- RIKU STORE — Manual Sales Launch V1
-- Enables real selling through WhatsApp before Midtrans is active.
-- Run AFTER the latest existing migration.
-- =============================================================================

BEGIN;

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS manual_sales_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS manual_payment_instructions TEXT NOT NULL DEFAULT
  'Pembayaran otomatis belum tersedia. Hubungi admin melalui WhatsApp untuk menerima instruksi pembayaran.';

CREATE OR REPLACE FUNCTION public.get_public_store_settings()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'store_name', store_name,
    'store_tagline', store_tagline,
    'support_email', support_email,
    'whatsapp_number', whatsapp_number,
    'payment_window_minutes', payment_window_minutes,
    'default_warranty_days', default_warranty_days,
    'credential_visibility_days', credential_visibility_days,
    'manual_sales_enabled', manual_sales_enabled,
    'manual_payment_instructions', manual_payment_instructions
  )
  FROM public.store_settings
  WHERE singleton = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_manual_sales_settings(
  p_enabled BOOLEAN,
  p_instructions TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_enabled
     AND NULLIF(btrim(COALESCE(p_instructions, '')), '') IS NULL THEN
    RAISE EXCEPTION 'manual_payment_instructions_required';
  END IF;

  UPDATE public.store_settings
  SET
    manual_sales_enabled = p_enabled,
    manual_payment_instructions = COALESCE(
      NULLIF(btrim(p_instructions), ''),
      'Pembayaran otomatis belum tersedia. Hubungi admin melalui WhatsApp untuk menerima instruksi pembayaran.'
    ),
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE singleton = TRUE;

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    entity_type,
    new_values
  )
  VALUES (
    auth.uid(),
    'store.manual_sales.update',
    'store_settings',
    jsonb_build_object(
      'manual_sales_enabled', p_enabled,
      'manual_payment_instructions', NULLIF(btrim(p_instructions), '')
    )
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_manual_payment_and_deliver(
  p_order_id UUID,
  p_payment_reference TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
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
  v_existing_redemption UUID;
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

  IF v_order.order_source <> 'public' THEN
    RAISE EXCEPTION 'manual_confirmation_public_orders_only';
  END IF;

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
      'delivered_count', v_delivered_count
    );
  END IF;

  IF v_order.status IN ('expired', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'order_not_payable';
  END IF;

  IF v_order.reservation_expires_at IS NULL
     OR v_order.reservation_expires_at <= NOW() THEN
    RAISE EXCEPTION 'reservation_expired';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id
    AND status IN ('pending', 'processing')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending_payment_not_found';
  END IF;

  UPDATE public.payments
  SET
    provider = 'manual_transfer',
    payment_method = 'manual_whatsapp',
    external_id = COALESCE(
      NULLIF(btrim(COALESCE(p_payment_reference, '')), ''),
      external_id,
      'MANUAL-' || p_order_id::TEXT
    ),
    status = 'paid',
    paid_at = COALESCE(paid_at, NOW()),
    webhook_received_at = COALESCE(webhook_received_at, NOW()),
    webhook_idempotency_key = COALESCE(
      webhook_idempotency_key,
      'MANUAL-PAID-' || p_order_id::TEXT
    ),
    provider_payload = COALESCE(provider_payload, '{}'::JSONB)
      || jsonb_build_object(
        'manual_confirmation', TRUE,
        'confirmed_at', NOW(),
        'confirmed_by', auth.uid(),
        'admin_notes', NULLIF(btrim(COALESCE(p_admin_notes, '')), '')
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

  IF v_order.promo_code_id IS NOT NULL THEN
    SELECT id
    INTO v_existing_redemption
    FROM public.promo_code_redemptions
    WHERE order_id = p_order_id
    LIMIT 1;

    IF v_existing_redemption IS NULL THEN
      INSERT INTO public.promo_code_redemptions (
        promo_code_id,
        order_id,
        customer_email,
        discount_amount,
        redeemed_at
      )
      VALUES (
        v_order.promo_code_id,
        p_order_id,
        v_order.customer_email,
        v_order.discount_amount,
        NOW()
      );

      UPDATE public.promo_codes
      SET
        usage_count = usage_count + 1,
        updated_at = NOW()
      WHERE id = v_order.promo_code_id;
    END IF;
  END IF;

  BEGIN
    v_delivered_count := public.fulfill_order_delivery(p_order_id);

    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      action,
      entity_type,
      entity_id,
      new_values
    )
    VALUES (
      auth.uid(),
      'order.manual_payment.confirmed_and_delivered',
      'order',
      p_order_id,
      jsonb_build_object(
        'payment_status', 'paid',
        'delivery_status', 'delivered',
        'delivered_count', v_delivered_count,
        'payment_reference',
          NULLIF(btrim(COALESCE(p_payment_reference, '')), ''),
        'admin_notes',
          NULLIF(btrim(COALESCE(p_admin_notes, '')), '')
      )
    );

    RETURN jsonb_build_object(
      'ok', TRUE,
      'already_processed', FALSE,
      'delivered_count', v_delivered_count
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
      )
      VALUES (
        auth.uid(),
        'order.manual_payment.delivery_failed',
        'order',
        p_order_id,
        jsonb_build_object(
          'error', v_error_message,
          'payment_status', 'paid',
          'delivery_status', 'delivery_failed'
        )
      );

      RETURN jsonb_build_object(
        'ok', FALSE,
        'already_processed', FALSE,
        'delivered_count', 0,
        'message', v_error_message
      );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_manual_sales_settings(
  BOOLEAN, TEXT
)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_confirm_manual_payment_and_deliver(
  UUID, TEXT, TEXT
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_manual_sales_settings(
  BOOLEAN, TEXT
)
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_confirm_manual_payment_and_deliver(
  UUID, TEXT, TEXT
)
TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
