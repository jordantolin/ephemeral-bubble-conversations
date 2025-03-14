
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  GamificationProfile, 
  GamificationContextType,
  AchievementType 
} from '@/types/gamification';
import { defaultAchievements } from '@/utils/achievementUtils';
import { 
  fetchUserGamificationProfile, 
  createNewUserProfile 
} from '@/services/gamificationService';
import { useGamificationActions } from '@/hooks/useGamificationActions';

// Create context with default value
const GamificationContext = createContext<GamificationContextType>({
  profile: {
    level: 1,
    points: 0,
    bubblePoints: 0,
    reflectionPoints: 0,
    messagePoints: 0,
    achievements: defaultAchievements,
    dailyStreak: 0,
    lastActive: new Date().toISOString()
  },
  achievements: defaultAchievements,
  recentAchievement: null,
  isLoading: false,
  addPoints: async () => false,
  checkAchievement: async () => false,
  incrementAchievementProgress: async () => false,
  trackMessageSent: async () => {},
  resetRecentAchievement: () => {},
  refreshGamificationProfile: async () => {}
});

// Provider component
export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile>({
    level: 1,
    points: 0,
    bubblePoints: 0,
    reflectionPoints: 0,
    messagePoints: 0,
    achievements: defaultAchievements,
    dailyStreak: 0,
    lastActive: new Date().toISOString()
  });
  const [achievements, setAchievements] = useState<AchievementType[]>(defaultAchievements);
  const [recentAchievement, setRecentAchievement] = useState<AchievementType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset recent achievement
  const resetRecentAchievement = () => {
    setRecentAchievement(null);
  };
  
  // Use the gamification actions hook
  const { 
    addPoints, 
    checkAchievement, 
    incrementAchievementProgress, 
    trackMessageSent 
  } = useGamificationActions({
    user,
    profile,
    achievements,
    setProfile,
    setAchievements,
    setRecentAchievement
  });
  
  // Fetch or create user profile
  const fetchProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let userProfile = await fetchUserGamificationProfile(user.id);
      
      if (!userProfile) {
        userProfile = await createNewUserProfile(user.id);
      }
      
      setProfile(userProfile);
      setAchievements(userProfile.achievements);
    } catch (error) {
      console.error("Error fetching gamification profile:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);
  
  // Refresh gamification profile
  const refreshGamificationProfile = async () => {
    await fetchProfile();
  };
  
  return (
    <GamificationContext.Provider
      value={{
        profile,
        achievements,
        recentAchievement,
        isLoading,
        addPoints,
        checkAchievement,
        incrementAchievementProgress,
        trackMessageSent,
        resetRecentAchievement,
        refreshGamificationProfile
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

// Hook for using gamification context
export const useGamification = () => useContext(GamificationContext);
