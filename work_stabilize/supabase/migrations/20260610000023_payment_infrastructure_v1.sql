-- =============================================================================
-- RIKU STORE — Payment Infrastructure V1
-- Payment center support, webhook idempotency ledger, manual refund workflow.
-- Run AFTER 20260610000022_stabilization_security_v1.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_order_id TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS payment_provider_events_order_idx
  ON public.payment_provider_events(order_id, received_at DESC);

CREATE INDEX IF NOT EXISTS payment_provider_events_status_idx
  ON public.payment_provider_events(processing_status, received_at DESC);

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_provider_events_admin_read
ON public.payment_provider_events;

CREATE POLICY payment_provider_events_admin_read
ON public.payment_provider_events
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  requested_amount BIGINT NOT NULL CHECK (requested_amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN (
      'requested',
      'approved',
      'rejected',
      'processing',
      'processed',
      'failed',
      'cancelled'
    )),
  provider_refund_id TEXT,
  admin_notes TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refund_requests_order_idx
  ON public.refund_requests(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS refund_requests_status_idx
  ON public.refund_requests(status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refund_requests_admin_read
ON public.refund_requests;

CREATE POLICY refund_requests_admin_read
ON public.refund_requests
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_create_refund_request(
  p_order_id UUID,
  p_requested_amount BIGINT,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment_id UUID;
  v_refund_id UUID;
  v_existing_refund_total BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_requested_amount IS NULL OR p_requested_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_refund_amount';
  END IF;

  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'refund_reason_required';
  END IF;

  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'only_paid_order_can_be_refunded';
  END IF;

  SELECT id
    INTO v_payment_id
  FROM public.payments
  WHERE order_id = p_order_id
    AND status = 'paid'
  ORDER BY paid_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  SELECT COALESCE(SUM(requested_amount), 0)
    INTO v_existing_refund_total
  FROM public.refund_requests
  WHERE order_id = p_order_id
    AND status IN ('requested', 'approved', 'processing', 'processed');

  IF v_existing_refund_total + p_requested_amount > v_order.total_amount THEN
    RAISE EXCEPTION 'refund_amount_exceeds_order_total';
  END IF;

  INSERT INTO public.refund_requests (
    order_id,
    payment_id,
    requested_amount,
    reason,
    status,
    requested_by
  )
  VALUES (
    p_order_id,
    v_payment_id,
    p_requested_amount,
    btrim(p_reason),
    'requested',
    auth.uid()
  )
  RETURNING id INTO v_refund_id;

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    entity_type,
    entity_id,
    new_values
  )
  VALUES (
    auth.uid(),
    'refund.request.create',
    'refund_request',
    v_refund_id,
    jsonb_build_object(
      'order_id', p_order_id,
      'requested_amount', p_requested_amount,
      'reason', btrim(p_reason),
      'status', 'requested'
    )
  );

  RETURN v_refund_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_refund_request(
  p_refund_id UUID,
  p_decision TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_old public.refund_requests%ROWTYPE;
  v_new_status TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_decision NOT IN ('approve', 'reject', 'cancel') THEN
    RAISE EXCEPTION 'invalid_refund_decision';
  END IF;

  SELECT *
    INTO v_old
  FROM public.refund_requests
  WHERE id = p_refund_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund_request_not_found';
  END IF;

  IF v_old.status NOT IN ('requested', 'approved') THEN
    RAISE EXCEPTION 'refund_request_cannot_be_changed';
  END IF;

  v_new_status := CASE p_decision
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    ELSE 'cancelled'
  END;

  UPDATE public.refund_requests
  SET
    status = v_new_status,
    admin_notes = NULLIF(btrim(COALESCE(p_admin_notes, '')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_refund_id;

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
    'refund.request.review',
    'refund_request',
    p_refund_id,
    jsonb_build_object(
      'status', v_old.status,
      'admin_notes', v_old.admin_notes
    ),
    jsonb_build_object(
      'status', v_new_status,
      'admin_notes', NULLIF(btrim(COALESCE(p_admin_notes, '')), '')
    )
  );

  RETURN p_refund_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_provider_event(
  p_provider TEXT,
  p_external_event_id TEXT,
  p_event_type TEXT,
  p_external_order_id TEXT,
  p_order_id UUID,
  p_payment_id UUID,
  p_verification_status TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_inserted BOOLEAN := FALSE;
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'service_role_required';
  END IF;

  IF NULLIF(btrim(COALESCE(p_provider, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_external_event_id, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_event_type, '')), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_provider_event';
  END IF;

  INSERT INTO public.payment_provider_events (
    provider,
    external_event_id,
    event_type,
    external_order_id,
    order_id,
    payment_id,
    verification_status,
    payload
  )
  VALUES (
    lower(btrim(p_provider)),
    btrim(p_external_event_id),
    btrim(p_event_type),
    NULLIF(btrim(COALESCE(p_external_order_id, '')), ''),
    p_order_id,
    p_payment_id,
    p_verification_status,
    COALESCE(p_payload, '{}'::JSONB)
  )
  ON CONFLICT (provider, external_event_id)
  DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    v_inserted := TRUE;
  ELSE
    SELECT id
      INTO v_event_id
    FROM public.payment_provider_events
    WHERE provider = lower(btrim(p_provider))
      AND external_event_id = btrim(p_external_event_id);
  END IF;

  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'inserted', v_inserted,
    'duplicate', NOT v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_refund_request(UUID, BIGINT, TEXT)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_review_refund_request(UUID, TEXT, TEXT)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.record_payment_provider_event(
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, JSONB
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_refund_request(UUID, BIGINT, TEXT)
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_review_refund_request(UUID, TEXT, TEXT)
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.record_payment_provider_event(
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, JSONB
)
TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
