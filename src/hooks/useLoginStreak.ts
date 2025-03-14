
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/context/GamificationContext";
import { updateDailyStreakInDB } from "@/services/gamificationService";

export const useLoginStreak = () => {
  const { user } = useAuth();
  const { profile, checkAchievement } = useGamification();

  useEffect(() => {
    if (!user) return;

    // Get last login date from localStorage
    const lastLoginKey = `last_login_${user.id}`;
    const lastLogin = localStorage.getItem(lastLoginKey);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if this is a new day login
    if (!lastLogin || lastLogin !== today) {
      // Update last login date
      localStorage.setItem(lastLoginKey, today);
      
      // If last login was yesterday, increment streak
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const todayDate = new Date(today);
        
        // Calculate the difference in days
        const diffTime = todayDate.getTime() - lastLoginDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // If exactly 1 day difference, increment streak in database
        if (diffDays === 1) {
          const newStreak = profile.dailyStreak + 1;
          updateDailyStreakInDB(user.id, newStreak, today);
          
          // Check for streak achievement when streak reaches 3 or more days
          if (newStreak >= 3) {
            checkAchievement('daily-streak-3', newStreak);
          }
        }
        // If more than 1 day, reset streak
        else if (diffDays > 1) {
          updateDailyStreakInDB(user.id, 1, today);
        }
      }
    }
  }, [user, profile.dailyStreak, checkAchievement]);

  return null;
};
