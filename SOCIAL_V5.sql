-- ============================================================
-- Dial App — Social v5: round recap posts
-- Lets posts be a round recap (no photo) as well as a photo.
-- Run in Supabase → SQL Editor. Safe to run once.
-- ============================================================

ALTER TABLE public.posts ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'photo'; -- 'photo' | 'round'
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS meta jsonb;                          -- recap data for 'round' posts

-- Done.
