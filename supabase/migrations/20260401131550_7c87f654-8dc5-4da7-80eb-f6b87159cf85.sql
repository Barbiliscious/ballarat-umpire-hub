-- Add proxy voting columns
ALTER TABLE public.vote_submissions
  ADD COLUMN IF NOT EXISTS proxy_submitter_id uuid,
  ADD COLUMN IF NOT EXISTS proxy_submitter_name text,
  ADD COLUMN IF NOT EXISTS proxy_reason text;

-- Update RLS INSERT policy for proxy support
DROP POLICY IF EXISTS "Umpires can insert submissions" ON public.vote_submissions;
CREATE POLICY "Umpires can insert submissions" ON public.vote_submissions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = umpire_id OR proxy_submitter_id = auth.uid()
  );