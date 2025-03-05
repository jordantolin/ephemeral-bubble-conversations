
-- Create stored procedures for fetching achievements and user achievements safely
CREATE OR REPLACE FUNCTION public.get_all_achievements()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  points integer,
  icon_type text,
  category text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, description, points, icon_type, category, created_at
  FROM public.achievements
  ORDER BY points DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_achievements_with_details(user_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  achievement_id uuid,
  created_at timestamptz,
  name text,
  description text,
  points integer,
  icon_type text,
  category text,
  achievement_created_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    ua.id, 
    ua.user_id, 
    ua.achievement_id, 
    ua.created_at,
    a.name,
    a.description,
    a.points,
    a.icon_type,
    a.category,
    a.created_at as achievement_created_at
  FROM 
    public.user_achievements ua
  JOIN 
    public.achievements a ON ua.achievement_id = a.id
  WHERE 
    ua.user_id = user_id_param
  ORDER BY 
    ua.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.award_achievement_by_name(
  user_id_param uuid,
  achievement_name_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  achievement_id_var uuid;
  achievement_points int;
  achievement_desc text;
  achievement_icon text;
BEGIN
  -- Get the achievement details
  SELECT id, points, description, icon_type INTO achievement_id_var, achievement_points, achievement_desc, achievement_icon
  FROM public.achievements
  WHERE name = achievement_name_param;
  
  IF achievement_id_var IS NULL THEN
    RAISE EXCEPTION 'Achievement "%" not found', achievement_name_param;
  END IF;
  
  -- Check if the user already has this achievement
  IF EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = user_id_param AND achievement_id = achievement_id_var
  ) THEN
    -- User already has this achievement
    RETURN FALSE;
  END IF;
  
  -- Award the achievement
  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (user_id_param, achievement_id_var);
  
  -- Create a notification
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    icon_type, 
    points,
    read
  )
  VALUES (
    user_id_param,
    'Achievement Unlocked!',
    'You earned "' || achievement_name_param || '": ' || achievement_desc,
    'achievement',
    achievement_icon,
    achievement_points,
    false
  );
  
  -- Update user's points in their profile
  UPDATE public.profiles
  SET 
    points = COALESCE(points, 0) + achievement_points,
    level = GREATEST(1, FLOOR((COALESCE(points, 0) + achievement_points) / 500) + 1)
  WHERE id = user_id_param;
  
  RETURN TRUE;
END;
$$;
