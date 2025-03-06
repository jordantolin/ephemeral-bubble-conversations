
-- Create gamification_profiles table
CREATE TABLE IF NOT EXISTS public.gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  bubble_points INTEGER NOT NULL DEFAULT 0,
  reflection_points INTEGER NOT NULL DEFAULT 0,
  message_points INTEGER NOT NULL DEFAULT 0,
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create RLS policies
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own gamification profile
CREATE POLICY "Users can read own gamification profile" 
ON public.gamification_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to update their own gamification profile
CREATE POLICY "Users can update own gamification profile" 
ON public.gamification_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for system to insert gamification profiles
CREATE POLICY "System can insert gamification profiles" 
ON public.gamification_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.gamification_profiles TO authenticated;
GRANT SELECT ON public.gamification_profiles TO anon;
