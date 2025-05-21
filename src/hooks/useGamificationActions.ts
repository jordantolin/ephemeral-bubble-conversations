
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  GamificationProfile, 
  AchievementType 
} from '@/types/gamification';
import { usePointsManagement } from './gamification/usePointsManagement';
import { useAchievementManagement } from './gamification/useAchievementManagement';
import { useAchievementTracking } from './gamification/useAchievementTracking';

interface UseGamificationActionsProps {
  user: User | null;
  profile: GamificationProfile;
  achievements: AchievementType[];
  setProfile: React.Dispatch<React.SetStateAction<GamificationProfile>>;
  setAchievements: React.Dispatch<React.SetStateAction<AchievementType[]>>;
  setRecentAchievement: React.Dispatch<React.SetStateAction<AchievementType | null>>;
  toast?: any; // Optional toast function
}

export const useGamificationActions = ({
  user,
  profile,
  achievements,
  setProfile,
  setAchievements,
  setRecentAchievement,
  toast
}: UseGamificationActionsProps) => {
  
  // Use the specialized hooks
  const { addPoints } = usePointsManagement({
    user,
    profile,
    setProfile,
    toast
  });
  
  const { 
    checkAchievement, 
    incrementAchievementProgress 
  } = useAchievementManagement({
    user,
    profile,
    achievements,
    setProfile,
    setAchievements,
    setRecentAchievement
  });
  
  const { trackMessageSent } = useAchievementTracking({
    user,
    addPoints,
    incrementAchievementProgress
  });
  
  return {
    addPoints,
    checkAchievement,
    incrementAchievementProgress,
    trackMessageSent
  };
};
