
-- Create triggers to send notifications for achievements

-- Function to create notifications for achievements
CREATE OR REPLACE FUNCTION public.create_achievement_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  achievement_data JSONB;
  achievement_id TEXT;
  achievement_name TEXT;
  achievement_description TEXT;
  achievement_points INTEGER;
BEGIN
  -- Loop through the new achievements in the jsonb array
  FOR achievement_data IN 
    SELECT jsonb_array_elements(NEW.achievements::jsonb)
  LOOP
    -- Check if the achievement is newly unlocked
    IF achievement_data->>'unlocked' = 'true' AND 
       (OLD.achievements IS NULL OR 
        NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(OLD.achievements::jsonb) old_achievement 
          WHERE old_achievement->>'id' = achievement_data->>'id' AND old_achievement->>'unlocked' = 'true'
        ))
    THEN
      -- Extract achievement details
      achievement_id := achievement_data->>'id';
      achievement_name := achievement_data->>'name';
      achievement_description := achievement_data->>'description';
      achievement_points := (achievement_data->>'points')::INTEGER;
      
      -- Create notification
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        icon_type,
        points
      ) VALUES (
        NEW.user_id,
        'Achievement Unlocked!',
        achievement_name || ': ' || achievement_description,
        'achievement',
        CASE
          WHEN achievement_id LIKE '%streak%' THEN 'zap'
          WHEN achievement_id LIKE '%bubble%' THEN 'gift'
          ELSE 'award'
        END,
        achievement_points
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for achievement notifications
DROP TRIGGER IF EXISTS on_achievement_unlocked ON public.gamification_profiles;
CREATE TRIGGER on_achievement_unlocked
  AFTER UPDATE OF achievements ON public.gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_achievement_notification();

-- Function to create level up notifications
CREATE OR REPLACE FUNCTION public.create_level_up_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if level has increased
  IF NEW.level > OLD.level THEN
    -- Create notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      icon_type,
      points
    ) VALUES (
      NEW.user_id,
      'Level Up!',
      'Congratulations! You''ve reached level ' || NEW.level || '!',
      'level-up',
      'star',
      100 * (NEW.level - OLD.level)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for level up notifications
DROP TRIGGER IF EXISTS on_level_up ON public.gamification_profiles;
CREATE TRIGGER on_level_up
  AFTER UPDATE OF level ON public.gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_level_up_notification();

-- Function to create streak notifications
CREATE OR REPLACE FUNCTION public.create_streak_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if daily streak has increased and is a milestone
  IF NEW.daily_streak > OLD.daily_streak AND NEW.daily_streak >= 3 AND NEW.daily_streak % 3 = 0 THEN
    -- Create notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      icon_type,
      points
    ) VALUES (
      NEW.user_id,
      'Streak Milestone!',
      'You''ve maintained a ' || NEW.daily_streak || ' day streak! Keep going!',
      'streak',
      'zap',
      NEW.daily_streak * 5
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for streak notifications
DROP TRIGGER IF EXISTS on_streak_milestone ON public.gamification_profiles;
CREATE TRIGGER on_streak_milestone
  AFTER UPDATE OF daily_streak ON public.gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_streak_notification();
