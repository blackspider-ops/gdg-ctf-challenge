-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('player', 'admin');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Create challenges table
CREATE TABLE public.challenges (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_md TEXT NOT NULL,
  hint_md TEXT,
  answer_pattern TEXT NOT NULL,
  is_regex BOOLEAN NOT NULL DEFAULT false,
  points INTEGER NOT NULL DEFAULT 100,
  order_index INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for challenges
CREATE POLICY "Challenges are viewable by authenticated users" 
ON public.challenges 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage challenges" 
ON public.challenges 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create challenge_progress table
CREATE TABLE public.challenge_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  solved_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  incorrect_attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'solved', 'given_up')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS on challenge_progress
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge_progress
CREATE POLICY "Users can view their own progress" 
ON public.challenge_progress 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON public.challenge_progress 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.challenge_progress 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Create user_summary view for quick access to user stats
CREATE VIEW public.user_summary AS
SELECT 
  p.user_id,
  p.full_name,
  p.email,
  p.role,
  COALESCE(MAX(c.order_index), 0) as current_challenge_index,
  COUNT(CASE WHEN cp.status = 'solved' THEN 1 END) as challenges_solved,
  SUM(CASE WHEN cp.status = 'solved' THEN c.points - cp.incorrect_attempts ELSE 0 END) as total_points
FROM public.profiles p
LEFT JOIN public.challenge_progress cp ON p.user_id = cp.user_id AND cp.status = 'solved'
LEFT JOIN public.challenges c ON cp.challenge_id = c.id
GROUP BY p.user_id, p.full_name, p.email, p.role;

-- Enable RLS on user_summary
ALTER VIEW public.user_summary SET (security_invoker = true);

-- Create event_settings table for global configuration
CREATE TABLE public.event_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on event_settings
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for event_settings
CREATE POLICY "Event settings are viewable by authenticated users" 
ON public.event_settings 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage event settings" 
ON public.event_settings 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenge_progress_updated_at
  BEFORE UPDATE ON public.challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_settings_updated_at
  BEFORE UPDATE ON public.event_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email, ''),
    'player'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();