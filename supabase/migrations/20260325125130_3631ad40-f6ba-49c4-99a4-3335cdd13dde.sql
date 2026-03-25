
ALTER TABLE public.profiles ADD COLUMN is_disabled boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.audit_log;
CREATE POLICY "Admins can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (has_admin_access(auth.uid()));
