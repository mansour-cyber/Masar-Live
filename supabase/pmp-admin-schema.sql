ALTER TABLE public.pmp_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'learner' CHECK (role IN ('admin','learner'));
CREATE TABLE IF NOT EXISTS public.pmp_credentials (
  user_id uuid PRIMARY KEY REFERENCES public.pmp_users(id) ON DELETE CASCADE,
  salt text NOT NULL, hash text NOT NULL,
  iterations integer NOT NULL CHECK (iterations BETWEEN 310000 AND 2000000),
  must_change_password boolean NOT NULL DEFAULT true,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pmp_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pmp_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pmp_credentials TO service_role;
CREATE OR REPLACE FUNCTION public.pmp_create_user(p_username text,p_display_name text,p_salt text,p_hash text,p_iterations integer)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE created_id uuid;
BEGIN
  INSERT INTO public.pmp_users(id,username,display_name,active,role) VALUES(gen_random_uuid(),p_username,p_display_name,true,'learner') RETURNING id INTO created_id;
  INSERT INTO public.pmp_credentials(user_id,salt,hash,iterations,must_change_password) VALUES(created_id,p_salt,p_hash,p_iterations,true);
  RETURN created_id;
END;
$$;
REVOKE ALL ON FUNCTION public.pmp_create_user(text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pmp_create_user(text,text,text,text,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.pmp_change_password(p_user_id uuid,p_current_hash text,p_revision bigint,p_salt text,p_hash text,p_iterations integer,p_token_hash text,p_expires_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.pmp_credentials SET salt=p_salt,hash=p_hash,iterations=p_iterations,must_change_password=false,revision=revision+1,updated_at=now() WHERE user_id=p_user_id AND hash=p_current_hash AND revision=p_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'Password changed elsewhere' USING ERRCODE='40001'; END IF;
  DELETE FROM public.pmp_sessions WHERE user_id=p_user_id;
  INSERT INTO public.pmp_sessions(token_hash,user_id,expires_at) VALUES(p_token_hash,p_user_id,p_expires_at);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.pmp_change_password(uuid,text,bigint,text,text,integer,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pmp_change_password(uuid,text,bigint,text,text,integer,text,timestamptz) TO service_role;
CREATE OR REPLACE VIEW public.pmp_admin_user_overview WITH (security_invoker=true) AS
SELECT u.id,u.username,u.display_name,u.active,u.role,u.created_at,c.must_change_password,
  greatest(p.updated_at,b.updated_at) AS last_activity,
  (SELECT count(*) FROM jsonb_each(CASE WHEN jsonb_typeof(p.state->'done')='object' THEN p.state->'done' ELSE '{}'::jsonb END) d WHERE d.value='true'::jsonb) AS lessons_completed,
  (SELECT count(*) FROM jsonb_each(CASE WHEN jsonb_typeof(b.state->'progress')='object' THEN b.state->'progress' ELSE '{}'::jsonb END)) AS bank_practiced,
  (p.state->'assessments'->-1)->>'pct' AS level_latest_score,
  (p.state->'attempts'->-1)->>'pct' AS mock_latest_score,
  p.state->>'current' AS current_lesson
FROM public.pmp_users u LEFT JOIN public.pmp_credentials c ON c.user_id=u.id
LEFT JOIN public.pmp_progress p ON p.user_id=u.id LEFT JOIN public.pmp_practice_progress b ON b.user_id=u.id;
REVOKE ALL ON public.pmp_admin_user_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pmp_admin_user_overview TO service_role;
