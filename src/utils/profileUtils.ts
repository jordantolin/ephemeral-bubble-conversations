
import { GamificationProfile } from "@/types/gamification";

// Calculate level based on points
export const calculateLevel = (points: number): number => {
  return Math.floor(Math.sqrt(points / 100)) + 1;
};

// Update daily streak
export const updateDailyStreak = (currentProfile: GamificationProfile): GamificationProfile => {
  const today = new Date();
  const lastActive = new Date(currentProfile.lastActive);
  
  console.log(`Updating streak: current streak = ${currentProfile.dailyStreak}, last active = ${lastActive.toISOString()}`);
  
  // Check if last activity was yesterday
  const isYesterday = isDateYesterday(lastActive, today);
  
  // Check if last activity was today
  const isToday = isSameDay(lastActive, today);
  
  console.log(`Last active date check: isYesterday = ${isYesterday}, isToday = ${isToday}`);
  
  if (isYesterday) {
    // Increment streak if last active yesterday
    console.log(`Incrementing streak from ${currentProfile.dailyStreak} to ${currentProfile.dailyStreak + 1}`);
    return {
      ...currentProfile,
      dailyStreak: currentProfile.dailyStreak + 1,
      lastActive: today.toISOString()
    };
  } else if (!isToday) {
    // Reset streak if not active yesterday or today
    console.log(`Resetting streak from ${currentProfile.dailyStreak} to 1`);
    return {
      ...currentProfile,
      dailyStreak: 1,
      lastActive: today.toISOString()
    };
  }
  
  // If already active today, just return the current profile
  console.log(`Keeping streak at ${currentProfile.dailyStreak}`);
  return {
    ...currentProfile,
    lastActive: today.toISOString()
  };
};

// Helper function to check if a date is yesterday
const isDateYesterday = (date: Date, referenceDate: Date): boolean => {
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getDate() === date2.getDate() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
};
