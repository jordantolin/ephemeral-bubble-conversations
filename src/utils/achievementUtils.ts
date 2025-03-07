
import React from "react";
import { Award, Star, Trophy, Target, Gift } from "lucide-react";
import { AchievementType, SerializableAchievement } from "@/types/gamification";
import { Json } from "@/integrations/supabase/types";

// Helper to convert React icons to serializable format
export const serializeAchievements = (achievements: AchievementType[]): Record<string, any>[] => {
  return achievements.map(ach => ({
    id: ach.id,
    name: ach.name,
    description: ach.description,
    iconType: getIconTypeFromNode(ach.icon),
    points: ach.points,
    unlocked: ach.unlocked,
    progress: ach.progress,
    maxProgress: ach.maxProgress
  }));
};

// Helper to get icon type from React node
export const getIconTypeFromNode = (icon: React.ReactNode): string => {
  if (React.isValidElement(icon)) {
    const iconType = icon.type;
    if (iconType === Award) return 'award';
    if (iconType === Star) return 'star';
    if (iconType === Trophy) return 'trophy';
    if (iconType === Target) return 'target';
    if (iconType === Gift) return 'gift';
  }
  return 'award'; // Default icon type
};

// Helper to deserialize achievements back to React components
export const deserializeAchievements = (serialized: any[]): AchievementType[] => {
  if (!Array.isArray(serialized)) {
    console.error("Invalid achievement data:", serialized);
    return defaultAchievements;
  }
  
  try {
    return serialized.map(ach => ({
      id: ach.id || 'unknown',
      name: ach.name || 'Unknown Achievement',
      description: ach.description || 'No description available',
      icon: getIconFromType(ach.iconType || 'award'),
      points: typeof ach.points === 'number' ? ach.points : 50,
      unlocked: Boolean(ach.unlocked),
      progress: typeof ach.progress === 'number' ? ach.progress : undefined,
      maxProgress: typeof ach.maxProgress === 'number' ? ach.maxProgress : undefined
    }));
  } catch (error) {
    console.error("Error deserializing achievements:", error);
    return defaultAchievements;
  }
};

// Helper to get React icon from type string
export const getIconFromType = (iconType: string): React.ReactNode => {
  switch (iconType) {
    case 'award': return React.createElement(Award, { className: "h-6 w-6 text-white" });
    case 'star': return React.createElement(Star, { className: "h-6 w-6 text-white" });
    case 'trophy': return React.createElement(Trophy, { className: "h-6 w-6 text-white" });
    case 'target': return React.createElement(Target, { className: "h-6 w-6 text-white" });
    case 'gift': return React.createElement(Gift, { className: "h-6 w-6 text-white" });
    default: return React.createElement(Award, { className: "h-6 w-6 text-white" });
  }
};

// Default achievements
export const defaultAchievements: AchievementType[] = [
  {
    id: "first-bubble",
    name: "Bubble Creator",
    description: "Create your first bubble",
    icon: React.createElement(Award, { className: "h-6 w-6 text-white" }),
    points: 100,
    unlocked: false
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Send 10 messages in bubbles",
    icon: React.createElement(Star, { className: "h-6 w-6 text-white" }),
    points: 50,
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: "reflection-master",
    name: "Reflection Master",
    description: "Reflect on 5 different bubbles",
    icon: React.createElement(Trophy, { className: "h-6 w-6 text-white" }),
    points: 75,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: "daily-streak-3",
    name: "Regular Bubbler",
    description: "Log in for 3 consecutive days",
    icon: React.createElement(Target, { className: "h-6 w-6 text-white" }),
    points: 150,
    unlocked: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: "popular-bubble",
    name: "Popular Bubble",
    description: "Create a bubble that gets 5+ reflections",
    icon: React.createElement(Gift, { className: "h-6 w-6 text-white" }),
    points: 200,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  }
];

// Function to validate achievements array
export const validateAchievements = (achievements: any): AchievementType[] => {
  if (!Array.isArray(achievements) || achievements.length === 0) {
    return defaultAchievements;
  }
  
  // Check if achievements have valid structure
  const validAchievements = achievements.every(ach => 
    typeof ach === 'object' && ach !== null && 'id' in ach && 'name' in ach
  );
  
  return validAchievements ? achievements : defaultAchievements;
};
