
import { GamificationProfile } from "@/types/gamification";

// Calculate level based on points
export const calculateLevel = (points: number): number => {
  return Math.floor(Math.sqrt(points / 100)) + 1;
};

// Update daily streak
export const updateDailyStreak = (currentProfile: GamificationProfile): GamificationProfile => {
  const today = new Date();
  const lastActive = new Date(currentProfile.lastActive);
  
  // Check if last activity was yesterday
  const isYesterday = 
    today.getDate() - lastActive.getDate() === 1 || 
    (today.getDate() === 1 && 
      lastActive.getDate() === new Date(
        lastActive.getFullYear(), 
        lastActive.getMonth() + 1, 
        0
      ).getDate());
  
  // Check if last activity was today
  const isToday = 
    today.getDate() === lastActive.getDate() && 
    today.getMonth() === lastActive.getMonth() && 
    today.getFullYear() === lastActive.getFullYear();
  
  if (isYesterday) {
    // Increment streak if last active yesterday
    return {
      ...currentProfile,
      dailyStreak: currentProfile.dailyStreak + 1,
      lastActive: today.toISOString()
    };
  } else if (!isToday) {
    // Reset streak if not active yesterday or today
    return {
      ...currentProfile,
      dailyStreak: 1,
      lastActive: today.toISOString()
    };
  }
  
  // If already active today, just return the current profile
  return {
    ...currentProfile,
    lastActive: today.toISOString()
  };
};
