
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'umpire');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'umpire',
  first_login TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create rounds table
CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  season TEXT NOT NULL DEFAULT '2025',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create divisions table
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  division_id UUID REFERENCES public.divisions(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fixtures table
CREATE TABLE public.fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id),
  division_id UUID NOT NULL REFERENCES public.divisions(id),
  home_team_id UUID NOT NULL REFERENCES public.teams(id),
  away_team_id UUID NOT NULL REFERENCES public.teams(id),
  match_date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vote_submissions table
CREATE TABLE public.vote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id),
  umpire_id UUID NOT NULL REFERENCES auth.users(id),
  round_id UUID NOT NULL REFERENCES public.rounds(id),
  division_id UUID NOT NULL REFERENCES public.divisions(id),
  home_team_id UUID NOT NULL REFERENCES public.teams(id),
  away_team_id UUID NOT NULL REFERENCES public.teams(id),
  is_locked BOOLEAN NOT NULL DEFAULT true,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, umpire_id)
);

-- Create vote_lines table
CREATE TABLE public.vote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.vote_submissions(id) ON DELETE CASCADE,
  votes INTEGER NOT NULL CHECK (votes IN (1, 2, 3)),
  player_name TEXT NOT NULL,
  player_number INTEGER NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vote_submissions_updated_at BEFORE UPDATE ON public.vote_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'umpire');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: admins can manage
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Rounds, divisions, teams: readable by all authenticated
CREATE POLICY "Authenticated can view rounds" ON public.rounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rounds" ON public.rounds FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view divisions" ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage divisions" ON public.divisions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teams" ON public.teams FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Fixtures: readable by all authenticated
CREATE POLICY "Authenticated can view fixtures" ON public.fixtures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fixtures" ON public.fixtures FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Vote submissions: umpires can create/view own, admins can manage all
CREATE POLICY "Umpires can view own submissions" ON public.vote_submissions FOR SELECT USING (auth.uid() = umpire_id);
CREATE POLICY "Admins can view all submissions" ON public.vote_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Umpires can insert submissions" ON public.vote_submissions FOR INSERT WITH CHECK (auth.uid() = umpire_id);
CREATE POLICY "Admins can update submissions" ON public.vote_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Vote lines: follow submission access
CREATE POLICY "Users can view own vote lines" ON public.vote_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vote_submissions WHERE id = submission_id AND umpire_id = auth.uid())
);
CREATE POLICY "Admins can view all vote lines" ON public.vote_lines FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert vote lines" ON public.vote_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.vote_submissions WHERE id = submission_id AND umpire_id = auth.uid())
);
CREATE POLICY "Admins can update vote lines" ON public.vote_lines FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete vote lines" ON public.vote_lines FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Audit log: admins only
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Audit triggers on key tables
CREATE TRIGGER audit_vote_submissions AFTER INSERT OR UPDATE OR DELETE ON public.vote_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_vote_lines AFTER INSERT OR UPDATE OR DELETE ON public.vote_lines FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
