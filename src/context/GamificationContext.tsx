
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  GamificationProfile, 
  GamificationContextType,
  AchievementType,
  PointCategory
} from '@/types/gamification';
import { defaultAchievements } from '@/utils/achievementUtils';
import { useGamificationCore } from '@/hooks/useGamificationCore';
import { useAchievements } from '@/hooks/useAchievements';
import { useTrackAchievements } from '@/hooks/useTrackAchievements';

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
  
  // Use our custom hooks
  const {
    profile,
    setProfile,
    achievements,
    setAchievements,
    recentAchievement,
    setRecentAchievement,
    isLoading,
    resetRecentAchievement,
    fetchProfile,
    addPoints
  } = useGamificationCore(user?.id);
  
  // Calculate level helper function for the achievements hook
  const calculateLevel = (points: number): number => {
    return 1 + Math.floor(points / 100);
  };
  
  const { 
    checkAchievement, 
    incrementAchievementProgress 
  } = useAchievements({
    userId: user?.id,
    achievements,
    setAchievements,
    setRecentAchievement,
    profile,
    setProfile,
    calculateLevel
  });
  
  const { 
    trackMessageSent: trackMessage, 
    refreshGamificationProfile: refreshProfile 
  } = useTrackAchievements();
  
  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);
  
  // Wrapper functions to maintain API compatibility
  const trackMessageSent = async () => {
    await trackMessage(user?.id, incrementAchievementProgress);
  };
  
  const refreshGamificationProfile = async () => {
    await refreshProfile(fetchProfile);
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
