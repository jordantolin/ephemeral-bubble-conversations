
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  fetchUserGamificationProfile, 
  createNewUserProfile,
  updatePointsInDB,
  updateAchievementsInDB,
  updateProfileWithAchievementPointsInDB
} from '@/services/gamificationService';
import { 
  GamificationProfile, 
  GamificationContextType,
  AchievementType,
  PointCategory
} from '@/types/gamification';
import { defaultAchievements } from '@/utils/achievementUtils';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Calculate level from points
  const calculateLevel = (points: number): number => {
    // Simple level calculation: Level = 1 + floor(points/100)
    return 1 + Math.floor(points / 100);
  };
  
  // Add points to user profile
  const addPoints = async (
    amount: number, 
    category?: PointCategory
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const newPoints = profile.points + amount;
      const newLevel = calculateLevel(newPoints);
      
      // Update category points
      let bubblePoints = profile.bubblePoints;
      let reflectionPoints = profile.reflectionPoints;
      let messagePoints = profile.messagePoints;
      
      if (category === 'bubble') {
        bubblePoints += amount;
      } else if (category === 'reflection') {
        reflectionPoints += amount;
      } else if (category === 'message') {
        messagePoints += amount;
      }
      
      // Update profile in state
      setProfile(prev => ({
        ...prev,
        points: newPoints,
        level: newLevel,
        bubblePoints,
        reflectionPoints,
        messagePoints
      }));
      
      // Save to database
      await updatePointsInDB(
        user.id, 
        newPoints, 
        newLevel,
        bubblePoints,
        reflectionPoints,
        messagePoints
      );
      
      return true;
    } catch (error) {
      console.error("Error adding points:", error);
      return false;
    }
  };
  
  // Check and unlock achievement
  const checkAchievement = async (id: string, progress?: number): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Find achievement in the list
      const achievementIndex = achievements.findIndex(a => a.id === id);
      if (achievementIndex === -1) return false;
      
      const achievement = achievements[achievementIndex];
      
      // Skip if already unlocked
      if (achievement.unlocked) return false;
      
      let shouldUnlock = false;
      
      // Check if achievement should be unlocked based on progress
      if (achievement.maxProgress && progress) {
        // Update progress
        const newProgress = Math.max(progress, achievement.progress || 0);
        
        // Update achievement in state
        const updatedAchievements = [...achievements];
        updatedAchievements[achievementIndex] = {
          ...achievement,
          progress: newProgress
        };
        
        setAchievements(updatedAchievements);
        
        // Check if achievement should be unlocked
        if (newProgress >= achievement.maxProgress) {
          shouldUnlock = true;
        } else {
          // Only update progress in DB
          await updateAchievementsInDB(user.id, updatedAchievements);
          return false;
        }
      } else {
        // Simple achievement - unlock immediately
        shouldUnlock = true;
      }
      
      if (shouldUnlock) {
        // Unlock achievement
        const updatedAchievements = [...achievements];
        updatedAchievements[achievementIndex] = {
          ...achievement,
          unlocked: true,
          progress: achievement.maxProgress || 0
        };
        
        // Add points
        const newPoints = profile.points + achievement.points;
        const newLevel = calculateLevel(newPoints);
        
        // Update state
        setAchievements(updatedAchievements);
        setProfile(prev => ({
          ...prev,
          points: newPoints,
          level: newLevel
        }));
        
        // Set recent achievement
        setRecentAchievement(updatedAchievements[achievementIndex]);
        
        // Save to database
        await updateProfileWithAchievementPointsInDB(
          user.id,
          newPoints,
          newLevel,
          updatedAchievements
        );
        
        return true;
      }
    } catch (error) {
      console.error("Error checking achievement:", error);
    }
    
    return false;
  };
  
  // Increment achievement progress
  const incrementAchievementProgress = async (id: string, amount: number = 1): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Find achievement in the list
      const achievementIndex = achievements.findIndex(a => a.id === id);
      if (achievementIndex === -1) return false;
      
      const achievement = achievements[achievementIndex];
      
      // Skip if already unlocked
      if (achievement.unlocked) return false;
      
      // Update progress
      const currentProgress = achievement.progress || 0;
      const newProgress = Math.max(amount, currentProgress);
      
      // Update achievement in state
      const updatedAchievements = [...achievements];
      updatedAchievements[achievementIndex] = {
        ...achievement,
        progress: newProgress
      };
      
      setAchievements(updatedAchievements);
      
      // Check if achievement should be unlocked
      if (achievement.maxProgress && newProgress >= achievement.maxProgress) {
        return await checkAchievement(id, newProgress);
      } else {
        // Only update progress in DB
        await updateAchievementsInDB(user.id, updatedAchievements);
      }
    } catch (error) {
      console.error("Error incrementing achievement progress:", error);
    }
    
    return false;
  };
  
  // Track message sent for social butterfly achievement
  const trackMessageSent = async () => {
    if (!user) return;
    
    try {
      // Increment progress for social butterfly achievement
      await incrementAchievementProgress('social-butterfly');
    } catch (error) {
      console.error("Error tracking message sent:", error);
    }
  };
  
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
