-- RIKU STORE — Homepage Banner Carousel V1
BEGIN;

ALTER TABLE public.site_announcements
  ADD COLUMN IF NOT EXISTS image_path TEXT;

COMMENT ON COLUMN public.site_announcements.image_path IS
  'Optional image stored in the product-images bucket under homepage-banners/.';

NOTIFY pgrst, 'reload schema';
COMMIT;
