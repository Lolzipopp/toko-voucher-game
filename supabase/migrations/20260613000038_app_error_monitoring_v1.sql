BEGIN;

CREATE TABLE IF NOT EXISTS public.app_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  pathname text,
  digest text,
  user_agent text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_error_events_unresolved_created
  ON public.app_error_events (created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.app_error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_error_events_admin_read ON public.app_error_events;
CREATE POLICY app_error_events_admin_read
ON public.app_error_events FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS app_error_events_admin_update ON public.app_error_events;
CREATE POLICY app_error_events_admin_update
ON public.app_error_events FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.report_client_error(
  p_message text,
  p_pathname text DEFAULT NULL,
  p_digest text DEFAULT NULL,
  p_source text DEFAULT 'client',
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_error_events (source, message, pathname, digest, user_agent)
  VALUES (
    left(coalesce(nullif(trim(p_source), ''), 'client'), 50),
    left(coalesce(nullif(trim(p_message), ''), 'Client error'), 500),
    left(p_pathname, 300),
    left(p_digest, 120),
    left(p_user_agent, 500)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.report_client_error(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_error(text, text, text, text, text) TO anon, authenticated;

COMMIT;
