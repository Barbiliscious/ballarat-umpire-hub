
-- Create has_admin_access helper function
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  )
$$;

-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Recreate all policies with has_admin_access
CREATE POLICY "Admins can update submissions" ON public.vote_submissions FOR UPDATE TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view all submissions" ON public.vote_submissions FOR SELECT TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert submissions" ON public.vote_submissions FOR INSERT TO public WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete vote lines" ON public.vote_lines FOR DELETE TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view all vote lines" ON public.vote_lines FOR SELECT TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert vote lines" ON public.vote_lines FOR INSERT TO public WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT TO public USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage divisions" ON public.divisions FOR ALL TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can manage fixtures" ON public.fixtures FOR ALL TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can manage rounds" ON public.rounds FOR ALL TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can manage teams" ON public.teams FOR ALL TO public USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO public USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO public WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO public USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO public USING (has_admin_access(auth.uid()));
