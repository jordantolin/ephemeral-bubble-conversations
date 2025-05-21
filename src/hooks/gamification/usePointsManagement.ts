
import { useState } from 'react';
import { updatePointsInDB } from '@/services/gamificationService';
import { GamificationProfile } from '@/types/gamification';
import { calculateLevel } from '@/utils/profileUtils';
import { User } from '@supabase/supabase-js';

interface UsePointsManagementProps {
  user: User | null;
  profile: GamificationProfile;
  setProfile: React.Dispatch<React.SetStateAction<GamificationProfile>>;
  toast?: any; // Optional toast function
}

export const usePointsManagement = ({
  user,
  profile,
  setProfile,
  toast
}: UsePointsManagementProps) => {
  
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
  
  return { addPoints };
};
