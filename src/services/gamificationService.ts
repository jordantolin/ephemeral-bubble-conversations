
import { supabase } from "@/integrations/supabase/client";
import { AchievementType, GamificationProfile, SerializableAchievement } from "@/types/gamification";
import { defaultAchievements, deserializeAchievements, serializeAchievements } from "@/utils/achievementUtils";
import { updateDailyStreak } from "@/utils/profileUtils";
import { Json } from "@/integrations/supabase/types";

// Default gamification profile
export const defaultProfile: GamificationProfile = {
  level: 1,
  points: 0,
  bubblePoints: 0,
  reflectionPoints: 0,
  messagePoints: 0,
  achievements: defaultAchievements,
  dailyStreak: 0,
  lastActive: new Date().toISOString()
};

export async function fetchUserGamificationProfile(userId: string): Promise<GamificationProfile> {
  const { data, error } = await supabase
    .from('gamification_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  if (data) {
    // Parse stored achievements - deserialize the achievements from the database
    const storedAchievements = data.achievements ? 
      deserializeAchievements(data.achievements as any[]) : 
      defaultAchievements;
    
    // Create profile with updated daily streak
    const updatedProfile = updateDailyStreak({
      level: data.level || 1,
      points: data.points || 0,
      bubblePoints: data.bubble_points || 0,
      reflectionPoints: data.reflection_points || 0,
      messagePoints: data.message_points || 0,
      achievements: storedAchievements,
      dailyStreak: data.daily_streak || 0,
      lastActive: data.last_active || new Date().toISOString()
    });
    
    return updatedProfile;
  }
  
  // Return default profile if no data found
  return {
    ...defaultProfile,
    dailyStreak: 1,
    lastActive: new Date().toISOString()
  };
}

export async function createNewUserProfile(userId: string): Promise<GamificationProfile> {
  const newProfile = {
    ...defaultProfile,
    dailyStreak: 1,
    lastActive: new Date().toISOString()
  };
  
  // Serialize achievements for storage
  const serializedAchievements = serializeAchievements(newProfile.achievements);
  
  await supabase
    .from('gamification_profiles')
    .insert({
      user_id: userId,
      level: newProfile.level,
      points: newProfile.points,
      bubble_points: newProfile.bubblePoints,
      reflection_points: newProfile.reflectionPoints,
      message_points: newProfile.messagePoints,
      achievements: serializedAchievements as unknown as Json,
      daily_streak: newProfile.dailyStreak,
      last_active: newProfile.lastActive
    });
    
  return newProfile;
}

export async function updateDailyStreakInDB(userId: string, dailyStreak: number, lastActive: string): Promise<void> {
  await supabase
    .from('gamification_profiles')
    .update({
      daily_streak: dailyStreak,
      last_active: lastActive
    })
    .eq('user_id', userId);
}

export async function updatePointsInDB(
  userId: string, 
  points: number, 
  level: number, 
  bubblePoints: number, 
  reflectionPoints: number, 
  messagePoints: number
): Promise<void> {
  await supabase
    .from('gamification_profiles')
    .update({
      points: points,
      level: level,
      bubble_points: bubblePoints,
      reflection_points: reflectionPoints,
      message_points: messagePoints
    })
    .eq('user_id', userId);
}

export async function updateAchievementsInDB(userId: string, achievements: AchievementType[]): Promise<void> {
  // Serialize achievements for storage
  const serializedAchievements = serializeAchievements(achievements);
  
  await supabase
    .from('gamification_profiles')
    .update({
      achievements: serializedAchievements as unknown as Json
    })
    .eq('user_id', userId);
}

export async function updateProfileWithAchievementPointsInDB(
  userId: string, 
  points: number, 
  level: number, 
  achievements: AchievementType[]
): Promise<void> {
  // Serialize achievements for storage
  const serializedAchievements = serializeAchievements(achievements);
  
  await supabase
    .from('gamification_profiles')
    .update({
      points: points,
      level: level,
      achievements: serializedAchievements as unknown as Json
    })
    .eq('user_id', userId);
}
