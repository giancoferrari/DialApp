-- ============================================================
-- Dial App — Social v2: comment likes
-- Run in Supabase → SQL Editor. Safe to run once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pcl_select" ON public.post_comment_likes;
DROP POLICY IF EXISTS "pcl_insert" ON public.post_comment_likes;
DROP POLICY IF EXISTS "pcl_delete" ON public.post_comment_likes;
CREATE POLICY "pcl_select" ON public.post_comment_likes FOR SELECT USING (true);
CREATE POLICY "pcl_insert" ON public.post_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pcl_delete" ON public.post_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Done.
