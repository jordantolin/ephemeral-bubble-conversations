
import { supabase } from "@/integrations/supabase/client";
import { AchievementType, GamificationProfile, SerializableAchievement } from "@/types/gamification";
import { defaultAchievements, deserializeAchievements, serializeAchievements, validateAchievements } from "@/utils/achievementUtils";
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
  try {
    const { data, error } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching gamification profile:", error.message);
      throw error;
    }

    if (data) {
      // Parse stored achievements - deserialize the achievements from the database
      let storedAchievements;
      try {
        storedAchievements = data.achievements ? 
          deserializeAchievements(data.achievements as any[]) : 
          defaultAchievements;
      } catch (e) {
        console.error("Error deserializing achievements:", e);
        storedAchievements = defaultAchievements;
      }
      
      // Create profile with updated daily streak
      const updatedProfile = updateDailyStreak({
        level: data.level || 1,
        points: data.points || 0,
        bubblePoints: data.bubble_points || 0,
        reflectionPoints: data.reflection_points || 0,
        messagePoints: data.message_points || 0,
        achievements: validateAchievements(storedAchievements),
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
  } catch (e) {
    console.error("Unexpected error in fetchUserGamificationProfile:", e);
    // Return default profile on error
    return {
      ...defaultProfile,
      dailyStreak: 1,
      lastActive: new Date().toISOString()
    };
  }
}

export async function createNewUserProfile(userId: string): Promise<GamificationProfile> {
  try {
    const newProfile = {
      ...defaultProfile,
      dailyStreak: 1,
      lastActive: new Date().toISOString()
    };
    
    // Serialize achievements for storage
    const serializedAchievements = serializeAchievements(newProfile.achievements);
    
    const { error } = await supabase
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
      
    if (error) {
      console.error("Error creating new profile:", error.message);
      throw error;
    }
    
    return newProfile;
  } catch (e) {
    console.error("Unexpected error in createNewUserProfile:", e);
    throw e;
  }
}

export async function updateDailyStreakInDB(userId: string, dailyStreak: number, lastActive: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        daily_streak: dailyStreak,
        last_active: lastActive
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating daily streak:", error.message);
      throw error;
    }
  } catch (e) {
    console.error("Unexpected error in updateDailyStreakInDB:", e);
  }
}

export async function updatePointsInDB(
  userId: string, 
  points: number, 
  level: number, 
  bubblePoints: number, 
  reflectionPoints: number, 
  messagePoints: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        points: points,
        level: level,
        bubble_points: bubblePoints,
        reflection_points: reflectionPoints,
        message_points: messagePoints
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating points:", error.message);
      throw error;
    }
  } catch (e) {
    console.error("Unexpected error in updatePointsInDB:", e);
  }
}

export async function updateAchievementsInDB(userId: string, achievements: AchievementType[]): Promise<void> {
  try {
    // Serialize achievements for storage
    const serializedAchievements = serializeAchievements(achievements);
    
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        achievements: serializedAchievements as unknown as Json
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating achievements:", error.message);
      throw error;
    }
  } catch (e) {
    console.error("Unexpected error in updateAchievementsInDB:", e);
  }
}

export async function updateProfileWithAchievementPointsInDB(
  userId: string, 
  points: number, 
  level: number, 
  achievements: AchievementType[]
): Promise<void> {
  try {
    // Serialize achievements for storage
    const serializedAchievements = serializeAchievements(achievements);
    
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        points: points,
        level: level,
        achievements: serializedAchievements as unknown as Json
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating profile with achievements:", error.message);
      throw error;
    }
  } catch (e) {
    console.error("Unexpected error in updateProfileWithAchievementPointsInDB:", e);
  }
}
