
-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Add columns to vote_submissions
ALTER TABLE public.vote_submissions 
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_by_admin_name text;

-- Drop old admin-only policies first (these don't reference super_admin)
DROP POLICY IF EXISTS "Admins can update submissions" ON public.vote_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.vote_submissions;
DROP POLICY IF EXISTS "Admins can update vote lines" ON public.vote_lines;
DROP POLICY IF EXISTS "Admins can delete vote lines" ON public.vote_lines;
DROP POLICY IF EXISTS "Admins can view all vote lines" ON public.vote_lines;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can manage divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admins can manage fixtures" ON public.fixtures;
DROP POLICY IF EXISTS "Admins can manage rounds" ON public.rounds;
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
