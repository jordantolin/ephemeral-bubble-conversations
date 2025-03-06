
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type Achievement = {
  name: string;
  description: string;
  awarded_at: string;
};

export type GamificationProfile = {
  id: string;
  user_id: string;
  points: number;
  level: number;
  message_points: number;
  bubble_points: number;
  reflection_points: number;
  achievements: Achievement[];
  daily_streak: number;
  last_active: string;
  created_at: string;
  updated_at: string;
};

export type NotificationType = 'achievement' | 'level_up' | 'points' | 'streak';

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  icon_type?: string;
  points?: number;
  read: boolean;
  created_at: string;
};

// Calculate level from points
export const calculateLevel = (points: number): number => {
  return Math.floor(Math.sqrt(points / 100)) + 1;
};

// Calculate points needed for next level
export const pointsForNextLevel = (currentLevel: number): number => {
  return (currentLevel * currentLevel) * 100;
};

// Calculate progress percentage to next level
export const levelProgress = (points: number, currentLevel: number): number => {
  const nextLevelPoints = pointsForNextLevel(currentLevel);
  const prevLevelPoints = pointsForNextLevel(currentLevel - 1);
  const levelDiff = nextLevelPoints - prevLevelPoints;
  const pointsInLevel = points - prevLevelPoints;
  
  return Math.min(100, Math.max(0, (pointsInLevel / levelDiff) * 100));
};

// Helper to initialize a user's gamification profile
export const initializeGamificationProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('gamification_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error || !data) {
    // Create profile if it doesn't exist
    await supabase
      .from('gamification_profiles')
      .insert({ user_id: userId });
  }
};

// Award points to a user
export const awardPoints = async (
  userId: string, 
  amount: number, 
  pointsType: 'message' | 'bubble' | 'reflection' | 'general' = 'general'
) => {
  try {
    // Properly cast parameters to avoid TypeScript errors
    const { error } = await supabase.rpc(
      'award_points', 
      { 
        user_id: userId, 
        amount, 
        points_type: pointsType 
      } as {
        user_id: string;
        amount: number;
        points_type: string;
      }
    );
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error awarding points:', error);
    return false;
  }
};

// Award an achievement to a user
export const awardAchievement = async (
  userId: string,
  name: string,
  description: string,
  points: number = 50
) => {
  try {
    // Properly cast parameters to avoid TypeScript errors
    const { error } = await supabase.rpc(
      'award_achievement',
      {
        user_id: userId,
        achievement_name: name,
        achievement_description: description,
        points
      } as {
        user_id: string;
        achievement_name: string;
        achievement_description: string;
        points: number;
      }
    );
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error awarding achievement:', error);
    return false;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Check and award streak achievements
export const checkStreakAchievements = async (userId: string, streak: number) => {
  if (streak === 3) {
    await awardAchievement(
      userId,
      '3-Day Streak',
      'Logged in for 3 consecutive days',
      100
    );
  } else if (streak === 7) {
    await awardAchievement(
      userId,
      'Week Warrior',
      'Logged in for 7 consecutive days',
      200
    );
  } else if (streak === 30) {
    await awardAchievement(
      userId,
      'Monthly Master',
      'Logged in for 30 consecutive days',
      500
    );
  }
};

// Check and award bubble creation achievements
export const checkBubbleAchievements = async (userId: string, bubbleCount: number) => {
  if (bubbleCount === 1) {
    await awardAchievement(
      userId,
      'First Bubble',
      'Created your first bubble',
      50
    );
  } else if (bubbleCount === 5) {
    await awardAchievement(
      userId,
      'Bubble Builder',
      'Created 5 bubbles',
      150
    );
  } else if (bubbleCount === 10) {
    await awardAchievement(
      userId,
      'Bubble Master',
      'Created 10 bubbles',
      300
    );
  }
};

// Check and award reflection achievements
export const checkReflectionAchievements = async (userId: string, reflectionCount: number) => {
  if (reflectionCount === 1) {
    await awardAchievement(
      userId,
      'First Reflection',
      'Made your first reflection',
      50
    );
  } else if (reflectionCount === 10) {
    await awardAchievement(
      userId,
      'Reflection Enthusiast',
      'Made 10 reflections',
      150
    );
  } else if (reflectionCount === 25) {
    await awardAchievement(
      userId,
      'Deep Thinker',
      'Made 25 reflections',
      300
    );
  }
};
