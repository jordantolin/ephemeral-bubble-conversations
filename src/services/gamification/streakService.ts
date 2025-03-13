
import { supabase } from "@/integrations/supabase/client";

export async function updateDailyStreakInDB(userId: string, dailyStreak: number, lastActive: string): Promise<void> {
  try {
    console.log(`Updating daily streak for user ${userId}: streak ${dailyStreak}, last active ${lastActive}`);
    
    const { error } = await supabase
      .from('gamification_profiles')
      .update({
        daily_streak: dailyStreak,
        last_active: lastActive,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error updating daily streak:", error.message);
      throw error;
    }
    
    console.log("Daily streak updated successfully");
  } catch (e) {
    console.error("Unexpected error in updateDailyStreakInDB:", e);
  }
}
