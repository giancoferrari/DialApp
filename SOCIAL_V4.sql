-- ============================================================
-- Dial App — Social v4: post reports
-- Run in Supabase → SQL Editor. Safe to run once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_reports_post_idx ON public.post_reports(post_id);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_select" ON public.post_reports;
DROP POLICY IF EXISTS "pr_insert" ON public.post_reports;
-- A reporter can see their own reports; moderation is done via the service role.
CREATE POLICY "pr_select" ON public.post_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "pr_insert" ON public.post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Done.
