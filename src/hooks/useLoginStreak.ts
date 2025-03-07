
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/context/GamificationContext";

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

      // Check for streak achievement if we have a streak of 3 or more days
      if (profile.dailyStreak >= 3) {
        checkAchievement('daily-streak-3', profile.dailyStreak);
      }
    }
  }, [user, profile.dailyStreak]);

  return null;
};
