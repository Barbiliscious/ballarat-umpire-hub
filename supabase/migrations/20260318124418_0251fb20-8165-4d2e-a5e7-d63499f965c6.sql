
-- Fix overly permissive audit_log insert policy
DROP POLICY "System can insert audit log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
