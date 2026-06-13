-- =============================================================================
-- RIKU STORE — Customer Account + Email OTP V1
-- Run AFTER 20260610000025_order_lookup_whatsapp_settings.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_profiles_email_unique_idx
  ON public.customer_profiles (lower(email::TEXT));

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_profiles_own_read
ON public.customer_profiles;

CREATE POLICY customer_profiles_own_read
ON public.customer_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_own_update
ON public.customer_profiles;

CREATE POLICY customer_profiles_own_update
ON public.customer_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  INSERT INTO public.customer_profiles (
    id,
    email,
    display_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(
      btrim(
        COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          ''
        )
      ),
      ''
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_profile
ON auth.users;

CREATE TRIGGER on_auth_user_created_customer_profile
AFTER INSERT OR UPDATE OF email
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_customer_user();

INSERT INTO public.customer_profiles (
  id,
  email,
  display_name
)
SELECT
  u.id,
  COALESCE(u.email, ''),
  NULLIF(
    btrim(
      COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        ''
      )
    ),
    ''
  )
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_user_id UUID
REFERENCES auth.users(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_customer_user_created_idx
ON public.orders(customer_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_customer_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  v_email := lower(
    btrim(
      COALESCE(
        auth.jwt()->>'email',
        ''
      )
    )
  );

  IF v_email = '' THEN
    RAISE EXCEPTION 'authenticated_email_missing';
  END IF;

  UPDATE public.orders
  SET
    customer_user_id = auth.uid(),
    updated_at = NOW()
  WHERE customer_user_id IS NULL
    AND lower(customer_email::TEXT) = v_email;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_account_orders()
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  customer_email TEXT,
  subtotal BIGINT,
  discount_amount BIGINT,
  total_amount BIGINT,
  status TEXT,
  payment_status TEXT,
  delivery_status TEXT,
  reservation_expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  warranty_ends_at TIMESTAMPTZ,
  credentials_hidden_at TIMESTAMPTZ,
  access_token TEXT,
  created_at TIMESTAMPTZ,
  item_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  PERFORM public.claim_customer_orders();

  RETURN QUERY
  SELECT
    o.id,
    o.order_number::TEXT,
    o.customer_email::TEXT,
    o.subtotal,
    o.discount_amount,
    o.total_amount,
    o.status::TEXT,
    o.payment_status::TEXT,
    o.delivery_status::TEXT,
    o.reservation_expires_at,
    o.paid_at,
    o.delivered_at,
    o.warranty_ends_at,
    o.credentials_hidden_at,
    o.access_token,
    o.created_at,
    COUNT(oi.id)::BIGINT AS item_count
  FROM public.orders o
  LEFT JOIN public.order_items oi
    ON oi.order_id = o.id
  WHERE o.customer_user_id = auth.uid()
  GROUP BY o.id
  ORDER BY o.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_customer_orders()
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.get_customer_account_orders()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_customer_orders()
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_customer_account_orders()
TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
