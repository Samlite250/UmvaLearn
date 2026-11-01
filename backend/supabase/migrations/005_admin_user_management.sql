-- Apply in the Supabase SQL editor after migrations 001-004.
-- Auth records are read only. Changes target public profiles and administrator roles.
BEGIN;

CREATE INDEX IF NOT EXISTS admin_roles_user_active_idx ON public.admin_roles (user_id, is_active);

CREATE TABLE IF NOT EXISTS public.admin_user_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_role TEXT,
  new_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_user_audit_target_created_idx ON public.admin_user_audit (target_id, created_at DESC);
ALTER TABLE public.admin_user_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_audit FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search TEXT DEFAULT '', p_role TEXT DEFAULT 'all', p_status TEXT DEFAULT 'all',
  p_page INTEGER DEFAULT 1, p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_total BIGINT;
  v_page INTEGER := greatest(1, coalesce(p_page, 1));
  v_size INTEGER := least(50, greatest(1, coalesce(p_page_size, 20)));
  v_search TEXT := left(btrim(coalesce(p_search, '')), 200);
  v_items JSONB;
  v_stats JSONB;
  v_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_admin() OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('all', 'user', 'admin', 'super_admin')
    OR p_status IS NULL OR p_status NOT IN ('all', 'confirmed', 'unconfirmed', 'suspended') THEN
    RAISE EXCEPTION 'Invalid user filter' USING ERRCODE = '22023';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND is_active AND role = 'super_admin') INTO v_super;

  WITH users_with_roles AS (
    SELECT u.id, u.email, coalesce(p.display_name, '') AS display_name,
      coalesce(p.study_level, 'secondary') AS study_level, coalesce(p.interface_lang, 'en') AS interface_lang,
      u.created_at, u.last_sign_in_at, u.email_confirmed_at,
      CASE WHEN u.banned_until > now() THEN 'suspended'
        WHEN u.email_confirmed_at IS NOT NULL THEN 'confirmed' ELSE 'unconfirmed' END AS status,
      CASE WHEN EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id = u.id AND r.is_active AND r.role = 'super_admin') THEN 'super_admin'
        WHEN EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id = u.id AND r.is_active) THEN 'admin' ELSE 'user' END AS system_role
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.deleted_at IS NULL
  ), filtered AS (
    SELECT * FROM users_with_roles u
    WHERE (v_search = '' OR strpos(lower(coalesce(u.email, '')), lower(v_search)) > 0
      OR strpos(lower(u.display_name), lower(v_search)) > 0 OR strpos(u.id::text, v_search) > 0)
      AND (p_role = 'all' OR u.system_role = p_role)
      AND (p_status = 'all' OR u.status = p_status)
  )
  SELECT count(*) INTO v_total FROM filtered;
  v_page := least(v_page, greatest(1, ceil(v_total::numeric / v_size)::integer));

  -- Bound the result set before converting rows to JSON. No password or token fields are exposed.
  WITH users_with_roles AS (
    SELECT u.id, u.email, coalesce(p.display_name, '') AS display_name,
      coalesce(p.study_level, 'secondary') AS study_level, coalesce(p.interface_lang, 'en') AS interface_lang,
      u.created_at, u.last_sign_in_at, u.email_confirmed_at,
      CASE WHEN u.banned_until > now() THEN 'suspended'
        WHEN u.email_confirmed_at IS NOT NULL THEN 'confirmed' ELSE 'unconfirmed' END AS status,
      CASE WHEN EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id = u.id AND r.is_active AND r.role = 'super_admin') THEN 'super_admin'
        WHEN EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id = u.id AND r.is_active) THEN 'admin' ELSE 'user' END AS system_role
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.deleted_at IS NULL
  ), page_rows AS (
    SELECT * FROM users_with_roles u WHERE
      (v_search = '' OR strpos(lower(coalesce(u.email, '')), lower(v_search)) > 0
        OR strpos(lower(u.display_name), lower(v_search)) > 0 OR strpos(u.id::text, v_search) > 0)
      AND (p_role = 'all' OR u.system_role = p_role) AND (p_status = 'all' OR u.status = p_status)
    ORDER BY u.created_at DESC, u.id LIMIT v_size OFFSET ((v_page - 1)::bigint * v_size)
  ) SELECT coalesce(jsonb_agg(to_jsonb(page_rows) ORDER BY created_at DESC, id), '[]'::jsonb) INTO v_items FROM page_rows;

  SELECT jsonb_build_object('total', count(*),
    'confirmed', count(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL),
    'new_this_week', count(*) FILTER (WHERE u.created_at >= now() - interval '7 days'),
    'administrators', count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.admin_roles r WHERE r.user_id = u.id AND r.is_active)))
    INTO v_stats FROM auth.users u WHERE u.deleted_at IS NULL;
  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_size,
    'stats', v_stats, 'can_manage_roles', v_super);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID, p_display_name TEXT, p_study_level TEXT, p_interface_lang TEXT, p_role TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_super BOOLEAN;
  v_old_role TEXT;
BEGIN
  -- Serialize role changes so concurrent requests cannot remove the final super administrator.
  PERFORM pg_catalog.pg_advisory_xact_lock(894643, 1);
  IF v_actor IS NULL OR NOT public.is_active_admin() OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_actor AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = v_actor AND is_active AND role = 'super_admin') INTO v_super;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_display_name IS NULL OR char_length(btrim(p_display_name)) NOT BETWEEN 1 AND 100
    OR p_study_level IS NULL OR p_study_level NOT IN ('primary', 'secondary', 'university')
    OR p_interface_lang IS NULL OR p_interface_lang NOT IN ('en', 'fr', 'rw')
    OR p_role IS NULL OR p_role NOT IN ('user', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid profile or role values' USING ERRCODE = '22023';
  END IF;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = p_user_id AND is_active AND role = 'super_admin') THEN 'super_admin'
    WHEN EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = p_user_id AND is_active) THEN 'admin' ELSE 'user' END INTO v_old_role;
  IF NOT v_super AND ((p_user_id <> v_actor AND v_old_role <> 'user') OR p_role <> v_old_role) THEN
    RAISE EXCEPTION 'Only super administrators can change roles or edit other administrators' USING ERRCODE = '42501';
  END IF;
  IF p_role <> v_old_role THEN
    IF p_user_id = v_actor THEN
      RAISE EXCEPTION 'You cannot change your own administrator role' USING ERRCODE = '42501';
    END IF;
    IF v_old_role = 'super_admin' AND NOT EXISTS (
      SELECT 1 FROM public.admin_roles WHERE user_id <> p_user_id AND is_active AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'The last super administrator cannot be removed' USING ERRCODE = '42501';
    END IF;
    UPDATE public.admin_roles SET is_active = FALSE WHERE user_id = p_user_id AND is_active;
    IF p_role <> 'user' THEN
      INSERT INTO public.admin_roles (user_id, role, is_active, granted_by) VALUES (p_user_id, p_role, TRUE, v_actor);
    END IF;
  END IF;
  INSERT INTO public.profiles (id, display_name, study_level, interface_lang)
    VALUES (p_user_id, btrim(p_display_name), p_study_level, p_interface_lang)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, study_level = EXCLUDED.study_level,
      interface_lang = EXCLUDED.interface_lang, updated_at = now();
  INSERT INTO public.admin_user_audit (actor_id, target_id, action, previous_role, new_role)
    VALUES (v_actor, p_user_id, CASE WHEN p_role <> v_old_role THEN 'profile_and_role_updated' ELSE 'profile_updated' END, v_old_role, p_role);
  INSERT INTO public.admin_events (event_type, user_id, is_guest, tool, success)
    VALUES ('admin_user_updated', v_actor, FALSE, 'admin', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_audit_log(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_records JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_admin() OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(records) ORDER BY created_at DESC), '[]'::jsonb) INTO v_records FROM (
    SELECT id, actor_id, action, previous_role, new_role, created_at FROM public.admin_user_audit
    WHERE target_id = p_user_id ORDER BY created_at DESC LIMIT 20
  ) records;
  RETURN v_records;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_user_audit_log(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_audit_log(UUID) TO authenticated;
COMMIT;
