
import { 
  AchievementType
} from "@/types/gamification";
import { 
  updateAchievementsInDB,
  updateProfileWithAchievementPointsInDB
} from "@/services/gamification";

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
      console.log(`Checking achievement ${id} with progress ${progress}`);
      
      // Find achievement in the list
      const achievementIndex = achievements.findIndex(a => a.id === id);
      if (achievementIndex === -1) {
        console.log(`Achievement ${id} not found`);
        return false;
      }
      
      const achievement = achievements[achievementIndex];
      
      // Skip if already unlocked
      if (achievement.unlocked) {
        console.log(`Achievement ${id} already unlocked`);
        return false;
      }
      
      let shouldUnlock = false;
      
      // Check if achievement should be unlocked based on progress
      if (achievement.maxProgress !== undefined && achievement.progress !== undefined) {
        // Update progress
        const newProgress = progress !== undefined ? progress : achievement.progress;
        console.log(`Setting progress for ${id}: ${newProgress}/${achievement.maxProgress}`);
        
        // Update achievement in state
        const updatedAchievements = [...achievements];
        updatedAchievements[achievementIndex] = {
          ...achievement,
          progress: newProgress
        };
        
        setAchievements(updatedAchievements);
        
        // Check if achievement should be unlocked
        if (newProgress >= achievement.maxProgress) {
          console.log(`Achievement ${id} should be unlocked based on progress`);
          shouldUnlock = true;
        } else {
          // Only update progress in DB
          await updateAchievementsInDB(userId, updatedAchievements);
          return false;
        }
      } else {
        // Simple achievement - unlock immediately
        console.log(`Simple achievement ${id} - unlocking`);
        shouldUnlock = true;
      }
      
      if (shouldUnlock) {
        console.log(`Unlocking achievement ${id}`);
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
        console.log(`Adding ${achievement.points} points. New total: ${newPoints}, new level: ${newLevel}`);
        
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
      console.log(`Incrementing progress for ${id} by ${amount}`);
      
      // Find achievement in the list
      const achievementIndex = achievements.findIndex(a => a.id === id);
      if (achievementIndex === -1) {
        console.log(`Achievement ${id} not found for increment`);
        return false;
      }
      
      const achievement = achievements[achievementIndex];
      
      // Skip if already unlocked
      if (achievement.unlocked) {
        console.log(`Achievement ${id} already unlocked, skipping increment`);
        return false;
      }
      
      // Make sure maxProgress is defined
      if (achievement.maxProgress === undefined) {
        console.log(`Achievement ${id} has no maxProgress defined, skipping`);
        return false;
      }
      
      // Update progress
      const currentProgress = achievement.progress || 0;
      const newProgress = currentProgress + amount;
      console.log(`Updating progress for ${id}: ${currentProgress} -> ${newProgress}`);
      
      // Update achievement in state
      const updatedAchievements = [...achievements];
      updatedAchievements[achievementIndex] = {
        ...achievement,
        progress: newProgress
      };
      
      setAchievements(updatedAchievements);
      
      // Check if achievement should be unlocked
      if (newProgress >= achievement.maxProgress) {
        console.log(`Achievement ${id} ready to unlock after increment`);
        return await checkAchievement(id, newProgress);
      } else {
        // Only update progress in DB
        console.log(`Saving updated progress to DB for ${id}`);
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
