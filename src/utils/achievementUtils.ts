
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
  return serialized.map(ach => ({
    id: ach.id,
    name: ach.name,
    description: ach.description,
    icon: getIconFromType(ach.iconType),
    points: ach.points,
    unlocked: ach.unlocked,
    progress: ach.progress,
    maxProgress: ach.maxProgress
  }));
};

// Helper to get React icon from type string
export const getIconFromType = (iconType: string): React.ReactNode => {
  switch (iconType) {
    case 'award': return React.createElement(Award, { className: "h-6 w-6 text-[#ebbd34]" });
    case 'star': return React.createElement(Star, { className: "h-6 w-6 text-[#ebbd34]" });
    case 'trophy': return React.createElement(Trophy, { className: "h-6 w-6 text-[#ebbd34]" });
    case 'target': return React.createElement(Target, { className: "h-6 w-6 text-[#ebbd34]" });
    case 'gift': return React.createElement(Gift, { className: "h-6 w-6 text-[#ebbd34]" });
    default: return React.createElement(Award, { className: "h-6 w-6 text-[#ebbd34]" });
  }
};

// Default achievements
export const defaultAchievements: AchievementType[] = [
  {
    id: "first-bubble",
    name: "Bubble Creator",
    description: "Create your first bubble",
    icon: React.createElement(Award, { className: "h-6 w-6 text-[#ebbd34]" }),
    points: 100,
    unlocked: false
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Send 10 messages in bubbles",
    icon: React.createElement(Star, { className: "h-6 w-6 text-[#ebbd34]" }),
    points: 50,
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: "reflection-master",
    name: "Reflection Master",
    description: "Reflect on 5 different bubbles",
    icon: React.createElement(Trophy, { className: "h-6 w-6 text-[#ebbd34]" }),
    points: 75,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: "daily-streak-3",
    name: "Regular Bubbler",
    description: "Log in for 3 consecutive days",
    icon: React.createElement(Target, { className: "h-6 w-6 text-[#ebbd34]" }),
    points: 150,
    unlocked: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: "popular-bubble",
    name: "Popular Bubble",
    description: "Create a bubble that gets 5+ reflections",
    icon: React.createElement(Gift, { className: "h-6 w-6 text-[#ebbd34]" }),
    points: 200,
    unlocked: false,
    progress: 0,
    maxProgress: 5
  }
];
