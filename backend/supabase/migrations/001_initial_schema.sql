-- UmvaLearn — Supabase Migration 001
-- Run via: supabase db push  OR  paste in Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles (extends auth.users) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  study_level     TEXT NOT NULL DEFAULT 'secondary' CHECK (study_level IN ('primary', 'secondary', 'university')),
  interface_lang  TEXT NOT NULL DEFAULT 'en' CHECK (interface_lang IN ('en', 'fr', 'rw')),
  input_lang      TEXT NOT NULL DEFAULT 'en',
  output_lang     TEXT NOT NULL DEFAULT 'rw',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Library Items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.library_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('text', 'transcript', 'translation', 'explanation', 'audio')),
  title           TEXT NOT NULL DEFAULT 'Untitled',
  content         TEXT NOT NULL DEFAULT '',
  source_lang     TEXT,
  target_lang     TEXT,
  audio_path      TEXT,          -- Supabase Storage path (signed URL on demand)
  is_favourite    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own library" ON public.library_items;
CREATE POLICY "Users can manage own library"
  ON public.library_items FOR ALL USING (auth.uid() = user_id);

-- ── Study Packs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_packs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  original_text   TEXT,
  transcript      TEXT,
  translation     TEXT,
  explanation     TEXT,
  audio_path      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own study packs" ON public.study_packs;
CREATE POLICY "Users can manage own study packs"
  ON public.study_packs FOR ALL USING (auth.uid() = user_id);

-- ── History ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool            TEXT NOT NULL CHECK (tool IN ('tts', 'stt', 'translate')),
  input_text      TEXT NOT NULL,
  output_text     TEXT,
  source_lang     TEXT NOT NULL,
  target_lang     TEXT,
  is_saved        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own history" ON public.history;
CREATE POLICY "Users can manage own history"
  ON public.history FOR ALL USING (auth.uid() = user_id);

-- ── Admin Roles ──────────────────────────────────────────────────
-- Create this before admin_events because its RLS policy references it.
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by      UUID REFERENCES auth.users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = check_user_id AND is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin(UUID) TO authenticated;

-- ── Admin Events (usage metrics) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type      TEXT NOT NULL,  -- 'tts_request', 'stt_request', 'translate_request', 'explain_request', 'error'
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest        BOOLEAN NOT NULL DEFAULT TRUE,
  tool            TEXT,
  source_lang     TEXT,
  target_lang     TEXT,
  provider        TEXT,
  latency_ms      INTEGER,
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  error_code      TEXT,
  estimated_cost  DECIMAL(10, 6),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only admins can read events — enforced via admin_roles check
ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can read admin_events" ON public.admin_events;
CREATE POLICY "Only admins can read admin_events"
  ON public.admin_events FOR SELECT
  USING (public.is_active_admin());

-- Admins can read roles; only super_admin can insert/update (enforced at service level)
DROP POLICY IF EXISTS "Admins can read roles" ON public.admin_roles;
CREATE POLICY "Admins can read roles"
  ON public.admin_roles FOR SELECT
  USING (public.is_active_admin());

-- ── Feedback ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category        TEXT NOT NULL CHECK (category IN ('translation', 'pronunciation', 'upload', 'technical', 'other')),
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;
CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;
CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT
  USING (public.is_active_admin());
