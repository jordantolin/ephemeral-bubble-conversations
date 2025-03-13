
import { supabase } from "@/integrations/supabase/client";
import { AchievementType } from "@/types/gamification";
import { Json } from "@/integrations/supabase/types";
import { serializeAchievements } from "@/utils/achievementUtils";

export async function updateAchievementsInDB(userId: string, achievements: AchievementType[]): Promise<void> {
  try {
    console.log(`Updating achievements for user ${userId}`);
    
    // Serialize achievements for storage
    const serializedAchievements = serializeAchievements(achievements);
    
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        achievements: serializedAchievements as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating achievements:", error.message);
      throw error;
    }
    
    console.log("Achievements updated successfully");
  } catch (e) {
    console.error("Unexpected error in updateAchievementsInDB:", e);
    throw e;
  }
}

export async function updateProfileWithAchievementPointsInDB(
  userId: string, 
  points: number, 
  level: number, 
  achievements: AchievementType[]
): Promise<void> {
  try {
    console.log(`Updating profile with achievements for user ${userId}: ${points} points, level ${level}`);
    
    // Serialize achievements for storage
    const serializedAchievements = serializeAchievements(achievements);
    
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        points: points,
        level: level,
        achievements: serializedAchievements as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating profile with achievements:", error.message);
      throw error;
    }
    
    console.log("Profile updated with achievements successfully");
  } catch (e) {
    console.error("Unexpected error in updateProfileWithAchievementPointsInDB:", e);
    throw e;
  }
}
