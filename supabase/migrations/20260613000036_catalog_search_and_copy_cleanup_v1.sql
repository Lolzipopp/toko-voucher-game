-- RIKU STORE — Correct imported Fighting Style wording.
-- This migration only updates display text; it does not touch inventory,
-- credentials, orders, payments, or reservations.

BEGIN;

UPDATE public.product_attributes
SET attribute_value = 'Semua Fighting Style aktif, kecuali Sanguine',
    updated_at = NOW()
WHERE lower(attribute_value) LIKE '%sanguine%'
  AND (
    lower(attribute_value) LIKE '%all on%'
    OR lower(attribute_value) LIKE '%all fighting style%'
    OR lower(attribute_value) LIKE '%all fighting styles%'
  );

COMMIT;
