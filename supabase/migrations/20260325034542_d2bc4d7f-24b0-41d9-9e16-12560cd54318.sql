-- Admin can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Admin can insert profiles (for email-less umpires)
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (has_admin_access(auth.uid()));