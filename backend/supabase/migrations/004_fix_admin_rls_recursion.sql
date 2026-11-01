-- Avoid recursive RLS evaluation when policies need to check admin membership.
-- SECURITY DEFINER executes the lookup as the function owner and bypasses the
-- admin_roles table's own SELECT policy.
CREATE OR REPLACE FUNCTION public.is_active_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = check_user_id
      AND is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins can read roles" ON public.admin_roles;
CREATE POLICY "Admins can read roles"
  ON public.admin_roles FOR SELECT
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Only admins can read admin_events" ON public.admin_events;
CREATE POLICY "Only admins can read admin_events"
  ON public.admin_events FOR SELECT
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;
CREATE POLICY "Admins can read all feedback"
  ON public.feedback FOR SELECT
  USING (public.is_active_admin());
