
import { supabase } from "@/integrations/supabase/client";

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
