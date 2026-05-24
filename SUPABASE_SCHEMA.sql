-- ============================================================
-- Dial App — Extended Schema
-- Run this in Supabase → SQL Editor → New query
--
-- IMPORTANT: Also ensure the shots table exists with RLS:
--
-- CREATE TABLE IF NOT EXISTS public.shots (
--   id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   club_id    text NOT NULL,
--   yardage    integer NOT NULL,
--   ts         timestamptz NOT NULL DEFAULT now(),
--   note       text DEFAULT ''
-- );
-- ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "shots_select" ON public.shots FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "shots_insert" ON public.shots FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "shots_delete" ON public.shots FOR DELETE USING (auth.uid() = user_id);
-- ============================================================

-- ── Courses ──────────────────────────────────────────────
CREATE TABLE public.courses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  tee        text NOT NULL DEFAULT '',
  holes      integer NOT NULL DEFAULT 18,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
  ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses"
  ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses"
  ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses"
  ON public.courses FOR DELETE USING (auth.uid() = user_id);

-- ── Course holes ─────────────────────────────────────────
CREATE TABLE public.course_holes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  par         integer NOT NULL DEFAULT 4,
  yardage     integer,
  UNIQUE(course_id, hole_number)
);

ALTER TABLE public.course_holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course holes"
  ON public.course_holes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own course holes"
  ON public.course_holes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own course holes"
  ON public.course_holes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own course holes"
  ON public.course_holes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.user_id = auth.uid()));

-- ── Rounds ───────────────────────────────────────────────
CREATE TABLE public.rounds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  course_name text NOT NULL,
  tee         text,
  holes       integer NOT NULL DEFAULT 18,
  played_at   date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rounds"
  ON public.rounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rounds"
  ON public.rounds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rounds"
  ON public.rounds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rounds"
  ON public.rounds FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX rounds_user_id_idx ON public.rounds(user_id);

-- ── Round holes ──────────────────────────────────────────
CREATE TABLE public.round_holes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  par         integer NOT NULL DEFAULT 4,
  yardage     integer,
  score       integer,
  putts       integer,
  fairway_hit boolean,
  gir         boolean,
  UNIQUE(round_id, hole_number)
);

ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own round holes"
  ON public.round_holes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can insert own round holes"
  ON public.round_holes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can update own round holes"
  ON public.round_holes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can delete own round holes"
  ON public.round_holes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.user_id = auth.uid()));

-- ── Practice sessions ────────────────────────────────────
CREATE TABLE public.practice_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_area   text NOT NULL,
  notes        text,
  rating       integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice sessions"
  ON public.practice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own practice sessions"
  ON public.practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice sessions"
  ON public.practice_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own practice sessions"
  ON public.practice_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX practice_sessions_user_id_idx ON public.practice_sessions(user_id);

-- ── User Profiles ────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handicap_index numeric(5,1),
  home_course    text,
  goal_score     integer,
  goal_handicap  numeric(5,1),
  goal_notes     text,
  equipment      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);
