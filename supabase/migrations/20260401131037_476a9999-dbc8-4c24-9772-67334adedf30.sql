-- Idempotent audit_log RLS fix
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can insert audit log" ON public.audit_log;
CREATE POLICY "Admins can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (has_admin_access(auth.uid()));