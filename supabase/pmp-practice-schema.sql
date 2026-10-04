CREATE TABLE IF NOT EXISTS public.pmp_practice_progress (
  user_id uuid PRIMARY KEY REFERENCES public.pmp_users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pmp_practice_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pmp_practice_progress FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pmp_practice_progress TO service_role;
COMMENT ON TABLE public.pmp_practice_progress IS 'Practice question bank state, accessed only through the session-authenticated pmp-practice-api function.';
