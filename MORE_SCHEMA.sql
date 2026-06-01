-- ============================================================
-- Dial App — Profile country + course-name corrections
-- Run in Supabase → SQL Editor. Safe to run once.
-- ============================================================

-- 1. Country on profiles (ISO 3166-1 alpha-2 code, e.g. 'PA', 'US')
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS country text;

-- 2. Fix course names that were saved from the API's generic course_name.
--    The app now stores the proper club name, but existing rows need fixing.
UPDATE public.courses SET name = 'Club de Golf de Panama'        WHERE name = 'Panama Golf Course';
UPDATE public.courses SET name = 'Santa Maria Golf & Country Club' WHERE name IN ('Santa Maria Golf Course', 'Santa Maria Golf Club');

UPDATE public.rounds SET course_name = 'Club de Golf de Panama'         WHERE course_name = 'Panama Golf Course';
UPDATE public.rounds SET course_name = 'Santa Maria Golf & Country Club' WHERE course_name IN ('Santa Maria Golf Course', 'Santa Maria Golf Club');

UPDATE public.matches SET course_name = 'Club de Golf de Panama'         WHERE course_name = 'Panama Golf Course';
UPDATE public.matches SET course_name = 'Santa Maria Golf & Country Club' WHERE course_name IN ('Santa Maria Golf Course', 'Santa Maria Golf Club');

-- Done.
