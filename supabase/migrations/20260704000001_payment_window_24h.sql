-- =============================================================================
-- RIKU STORE — Payment Window 24 Hours
-- Ubah default payment window dari 20 menit ke 1440 menit (24 jam).
-- Stok tetap terlihat user selama belum selesai payment.
-- Run AFTER 20260613000038_app_error_monitoring_v1.sql
-- =============================================================================

BEGIN;

-- Update store_settings default payment window ke 24 jam (1440 menit)
UPDATE public.store_settings
SET payment_window_minutes = 1440
WHERE singleton = TRUE;

-- Kalau belum ada row, insert
INSERT INTO public.store_settings (singleton, payment_window_minutes)
VALUES (TRUE, 1440)
ON CONFLICT (singleton) DO UPDATE
SET payment_window_minutes = 1440;

NOTIFY pgrst, 'reload schema';

COMMIT;
