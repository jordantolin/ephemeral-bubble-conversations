
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for tracking activity-based achievements
 */
export const useTrackAchievements = () => {
  
  // Track message sent for social butterfly achievement
  const trackMessageSent = async (
    userId: string | undefined,
    incrementAchievementProgress: (id: string, amount?: number) => Promise<boolean>
  ) => {
    if (!userId) return;
    
    try {
      // Increment progress for social butterfly achievement
      await incrementAchievementProgress('social-butterfly');
    } catch (error) {
      console.error("Error tracking message sent:", error);
    }
  };
  
  // Refresh gamification profile
  const refreshGamificationProfile = async (fetchProfile: () => Promise<void>) => {
    await fetchProfile();
  };
  
  return {
    trackMessageSent,
    refreshGamificationProfile
  };
};
