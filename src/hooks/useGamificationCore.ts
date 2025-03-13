
import { useState } from "react";
import { 
  GamificationProfile, 
  AchievementType,
  PointCategory
} from "@/types/gamification";
import { defaultAchievements } from "@/utils/achievementUtils";
import { 
  fetchUserGamificationProfile, 
  createNewUserProfile,
  updatePointsInDB,
  updateAchievementsInDB,
  updateProfileWithAchievementPointsInDB
} from "@/services/gamification";

/**
 * Hook that provides core gamification functionality
 */
export const useGamificationCore = (userId: string | undefined) => {
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
    if (!userId) return;
    
    setIsLoading(true);
    try {
      let userProfile = await fetchUserGamificationProfile(userId);
      
      if (!userProfile) {
        userProfile = await createNewUserProfile(userId);
      }
      
      setProfile(userProfile);
      setAchievements(userProfile.achievements);
    } catch (error) {
      console.error("Error fetching gamification profile:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
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
    if (!userId) return false;
    
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
        userId, 
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
  
  return {
    profile,
    setProfile,
    achievements,
    setAchievements,
    recentAchievement,
    setRecentAchievement,
    isLoading,
    setIsLoading,
    resetRecentAchievement,
    fetchProfile,
    addPoints
  };
};
