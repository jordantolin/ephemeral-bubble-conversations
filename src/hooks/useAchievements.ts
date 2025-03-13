
import { 
  AchievementType
} from "@/types/gamification";
import { 
  updateAchievementsInDB,
  updateProfileWithAchievementPointsInDB
} from "@/services/gamificationService";

type UseAchievementsParams = {
  userId: string | undefined;
  achievements: AchievementType[];
  setAchievements: (achievements: AchievementType[]) => void;
  setRecentAchievement: (achievement: AchievementType | null) => void;
  profile: { points: number };
  setProfile: (updater: (prev: any) => any) => void;
  calculateLevel: (points: number) => number;
};

/**
 * Hook that provides achievement-related functionality
 */
export const useAchievements = ({
  userId,
  achievements,
  setAchievements,
  setRecentAchievement,
  profile,
  setProfile,
  calculateLevel
}: UseAchievementsParams) => {
  
  // Check and unlock achievement
  const checkAchievement = async (id: string, progress?: number): Promise<boolean> => {
    if (!userId) return false;
    
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
          await updateAchievementsInDB(userId, updatedAchievements);
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
          userId,
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
    if (!userId) return false;
    
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
        await updateAchievementsInDB(userId, updatedAchievements);
      }
    } catch (error) {
      console.error("Error incrementing achievement progress:", error);
    }
    
    return false;
  };
  
  return { 
    checkAchievement, 
    incrementAchievementProgress 
  };
};
