-- ============================================================
-- Dial App — Social v3: post tags, reposts, notifications
-- Run in Supabase → SQL Editor. Safe to run once.
-- ============================================================

-- Players tagged in a post
CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pt_select" ON public.post_tags;
DROP POLICY IF EXISTS "pt_insert" ON public.post_tags;
DROP POLICY IF EXISTS "pt_delete" ON public.post_tags;
CREATE POLICY "pt_select" ON public.post_tags FOR SELECT USING (true);
-- only the post owner may tag people on their post
CREATE POLICY "pt_insert" ON public.post_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "pt_delete" ON public.post_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

-- Reposts (user_id = the person reposting)
CREATE TABLE IF NOT EXISTS public.reposts (
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp_select" ON public.reposts;
DROP POLICY IF EXISTS "rp_insert" ON public.reposts;
DROP POLICY IF EXISTS "rp_delete" ON public.reposts;
CREATE POLICY "rp_select" ON public.reposts FOR SELECT USING (true);
CREATE POLICY "rp_insert" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rp_delete" ON public.reposts FOR DELETE USING (auth.uid() = user_id);

-- Notifications (one row per recipient)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- recipient
  type       text NOT NULL,                                              -- 'post_tag' | 'repost'
  actor_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- who triggered it
  post_id    uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nf_select" ON public.notifications;
DROP POLICY IF EXISTS "nf_insert" ON public.notifications;
DROP POLICY IF EXISTS "nf_update" ON public.notifications;
DROP POLICY IF EXISTS "nf_delete" ON public.notifications;
CREATE POLICY "nf_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
-- the actor creates the notification for the recipient
CREATE POLICY "nf_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "nf_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "nf_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Done.
