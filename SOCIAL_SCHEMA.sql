-- ============================================================
-- Dial App — Social layer (Direct Messages + Profile Posts)
-- Run this in Supabase → SQL Editor → New query, then run it.
-- Safe to run once. Uses IF NOT EXISTS / ON CONFLICT where possible.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. DIRECT MESSAGES
-- ════════════════════════════════════════════════════════════

-- A conversation is a unique pair of users. The app always inserts
-- the lexicographically-smaller user id as user_a (see lib/messages.ts).
CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  read_at         timestamptz
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_user_a_idx  ON public.conversations(user_a);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx  ON public.conversations(user_b);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
DROP POLICY IF EXISTS "conv_update" ON public.conversations;
CREATE POLICY "conv_select" ON public.conversations FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "msg_select" ON public.messages;
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_update" ON public.messages;
CREATE POLICY "msg_select" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations c
                 WHERE c.id = conversation_id
                   AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.conversations c
                          WHERE c.id = conversation_id
                            AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
-- Recipient may stamp read_at
CREATE POLICY "msg_update" ON public.messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conversations c
                 WHERE c.id = conversation_id
                   AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

-- ════════════════════════════════════════════════════════════
-- 2. PROFILE POSTS (Instagram-style)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url  text NOT NULL,
  caption    text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_user_idx          ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_post_idx  ON public.post_comments(post_id, created_at);

ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Posts are public to any signed-in user (it's a social feed); only the
-- owner can create/edit/delete their own.
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_likes_select" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;
CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_comments_select" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_delete" ON public.post_comments;
CREATE POLICY "post_comments_select" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_delete" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- 3. REALTIME — let the app receive live messages
-- (ignore "already member of publication" errors if you re-run)
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ════════════════════════════════════════════════════════════
-- 4. STORAGE — bucket for post images (public read)
-- ════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "post_images_write"  ON storage.objects;
DROP POLICY IF EXISTS "post_images_delete" ON storage.objects;
CREATE POLICY "post_images_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');
CREATE POLICY "post_images_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "post_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Done. Refresh the app.
