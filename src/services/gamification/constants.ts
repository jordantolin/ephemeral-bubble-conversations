
import { GamificationProfile } from "@/types/gamification";
import { defaultAchievements } from "@/utils/achievementUtils";

// Default gamification profile
export const defaultProfile: GamificationProfile = {
  level: 1,
  points: 0,
  bubblePoints: 0,
  reflectionPoints: 0,
  messagePoints: 0,
  achievements: defaultAchievements,
  dailyStreak: 0,
  lastActive: new Date().toISOString()
};
