
import { useState } from 'react';
import { 
  updatePointsInDB,
  updateAchievementsInDB,
  updateProfileWithAchievementPointsInDB
} from '@/services/gamificationService';
import { 
  GamificationProfile, 
  AchievementType 
} from '@/types/gamification';
import { calculateLevel } from '@/utils/profileUtils';
import { User } from '@supabase/supabase-js';

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
  
  // Add points to user profile
  const addPoints = async (
    amount: number, 
    category?: 'bubble' | 'reflection' | 'message'
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const newPoints = profile.points + amount;
      const newLevel = calculateLevel(newPoints);
      const oldLevel = profile.level;
      
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
      
      // Check if leveled up
      if (newLevel > oldLevel) {
        // Show level up notification
        if (toast) {
          toast({
            title: "Level Up!",
            description: `Congratulations! You've reached level ${newLevel}!`,
            duration: 5000,
          });
        }
      }
      
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
      if (achievement.maxProgress && progress !== undefined) {
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
        
        // Set recent achievement to trigger popup
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
      const newProgress = currentProgress + amount;
      
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
      // Add message points
      await addPoints(5, 'message');
      
      // Increment progress for social butterfly achievement
      await incrementAchievementProgress('social-butterfly');
    } catch (error) {
      console.error("Error tracking message sent:", error);
    }
  };
  
  return {
    addPoints,
    checkAchievement,
    incrementAchievementProgress,
    trackMessageSent
  };
};
