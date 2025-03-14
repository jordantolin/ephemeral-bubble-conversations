
import { ReactNode } from "react";
import { Json } from "@/integrations/supabase/types";

// Define serializable achievement type for storage
export interface SerializableAchievement {
  id: string;
  name: string;
  description: string;
  iconType: string; // Store icon type as a string instead of ReactNode
  points: number;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

// Define achievement types for use in the app
export type AchievementType = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  points: number;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

// Define user gamification profile
export type GamificationProfile = {
  level: number;
  points: number;
  bubblePoints: number;
  reflectionPoints: number;
  messagePoints: number;
  achievements: AchievementType[];
  dailyStreak: number;
  lastActive: string;
};

export interface GamificationContextType {
  profile: GamificationProfile;
  achievements: AchievementType[];
  recentAchievement: AchievementType | null;
  isLoading: boolean;
  addPoints: (amount: number, category?: 'bubble' | 'reflection' | 'message') => Promise<boolean>;
  checkAchievement: (id: string, progress?: number) => Promise<boolean>;
  incrementAchievementProgress: (id: string, amount?: number) => Promise<boolean>;
  trackMessageSent: () => Promise<void>;
  resetRecentAchievement: () => void;
  refreshGamificationProfile: () => Promise<void>;
};

// Define size types for bubbles
export type BubbleSize = "sm" | "md" | "lg";
