
import { supabase } from "@/integrations/supabase/client";
import { GamificationProfile } from "@/types/gamification";
import { defaultProfile } from "./constants";
import { deserializeAchievements, validateAchievements, serializeAchievements } from "@/utils/achievementUtils";
import { updateDailyStreak } from "@/utils/profileUtils";
import { Json } from "@/integrations/supabase/types";

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
          defaultProfile.achievements;
      } catch (e) {
        console.error("Error deserializing achievements:", e);
        storedAchievements = defaultProfile.achievements;
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
