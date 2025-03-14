
import { User } from '@supabase/supabase-js';

interface UseAchievementTrackingProps {
  user: User | null;
  addPoints: (amount: number, category?: 'bubble' | 'reflection' | 'message') => Promise<boolean>;
  incrementAchievementProgress: (id: string, amount?: number) => Promise<boolean>;
}

export const useAchievementTracking = ({
  user,
  addPoints,
  incrementAchievementProgress
}: UseAchievementTrackingProps) => {
  
  // Track message sent for social butterfly achievement
  const trackMessageSent = async () => {
    if (!user) return;
    
    try {
      // Add message points
      await addPoints(5, 'message');
      
      // Increment progress for social butterfly achievement
      await incrementAchievementProgress('social-butterfly');
    } catch (error) {
      console.error("Error tracking message sent:", error);
    }
  };
  
  return {
    trackMessageSent
  };
};
