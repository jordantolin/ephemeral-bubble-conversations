
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/context/GamificationContext";
import { updateDailyStreakInDB } from "@/services/gamificationService";
import { GamificationContextType } from "@/types/gamification";
import { useToast } from "@/hooks/use-toast";

export const useLoginStreak = () => {
  const { user } = useAuth();
  const { profile, checkAchievement, addPoints } = useGamification() as GamificationContextType;
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    try {
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
            updateDailyStreakInDB(user.id, newStreak, today)
              .then(() => {
                // Add daily streak points (base 10 + 5 per day of streak)
                const streakPoints = 10 + (newStreak * 5);
                addPoints(streakPoints, 'streak');
                
                toast({
                  title: "Daily Streak!",
                  description: `Day ${newStreak}: +${streakPoints} points`,
                  variant: "default"
                });
                
                // Add bonus points for milestone streaks (every 5 days)
                if (newStreak % 5 === 0) {
                  const bonusPoints = newStreak * 10;
                  addPoints(bonusPoints, 'streak-milestone');
                  
                  toast({
                    title: "Streak Milestone!",
                    description: `${newStreak} day streak bonus: +${bonusPoints} points`,
                    variant: "default"
                  });
                }
                
                // Check for streak achievement when streak reaches 3 or more days
                if (newStreak >= 3) {
                  checkAchievement('daily-streak-3', newStreak);
                }
              })
              .catch(error => {
                console.error("Error updating daily streak:", error);
              });
          }
          // If more than 1 day, reset streak
          else if (diffDays > 1) {
            updateDailyStreakInDB(user.id, 1, today)
              .catch(error => {
                console.error("Error resetting daily streak:", error);
              });
          }
        } else {
          // First login, set streak to 1
          updateDailyStreakInDB(user.id, 1, today)
            .then(() => {
              // First login points
              addPoints(10, 'first-login');
              
              toast({
                title: "Welcome!",
                description: "First day: +10 points",
                variant: "default"
              });
            })
            .catch(error => {
              console.error("Error setting initial daily streak:", error);
            });
        }
      }
    } catch (error) {
      console.error("Error processing login streak:", error);
    }
  }, [user, profile.dailyStreak, checkAchievement, addPoints, toast]);

  return null;
};
