
import React, { useEffect, useState } from "react";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GamificationContextType } from "@/types/gamification";

// This component should be included in a main layout component 
// to track achievements without adding any visual elements
const GamificationTracker: React.FC = () => {
  const { user } = useAuth();
  const { 
    refreshGamificationProfile, 
    checkAchievement, 
    incrementAchievementProgress,
    addPoints,
    profile,
    achievements
  } = useGamification() as GamificationContextType;
  const [isMounted, setIsMounted] = useState(false);
  const [checksRun, setChecksRun] = useState(false);
  
  // Use the login streak hook
  useLoginStreak();
  
  // Refresh profile on mount
  useEffect(() => {
    if (user) {
      refreshGamificationProfile();
      setIsMounted(true);
    }
  }, [user, refreshGamificationProfile]);

  // Run all achievement checks only once when profile is loaded
  useEffect(() => {
    const runChecks = async () => {
      if (!user || !isMounted || checksRun || !achievements.length) return;
      
      try {
        console.log("Running achievement checks");
        
        // Only run checks once
        setChecksRun(true);
        
        // Check if any achievement is already unlocked to prevent rechecking
        const unlockedMap = achievements.reduce((acc, ach) => {
          acc[ach.id] = ach.unlocked;
          return acc;
        }, {} as Record<string, boolean>);
        
        // Check "First Bubble" achievement
        if (!unlockedMap['first-bubble']) {
          await checkFirstBubble();
        }
        
        // Check "Social Butterfly" achievement (message count)
        if (!unlockedMap['social-butterfly']) {
          await trackMessages();
        }
        
        // Check "Reflection Master" achievement
        if (!unlockedMap['reflection-master']) {
          await trackReflections();
        }
        
        // Check "Popular Bubble" achievement
        if (!unlockedMap['popular-bubble']) {
          await trackPopularBubbles();
        }
        
        // Check "Daily Streak" achievement
        if (!unlockedMap['daily-streak-3'] && profile.dailyStreak >= 3) {
          await checkAchievement('daily-streak-3');
        }
      } catch (error) {
        console.error("Error in achievement checks:", error);
      }
    };
    
    runChecks();
  }, [user, isMounted, achievements, profile, checkAchievement, incrementAchievementProgress]);

  // Helper functions for checking different achievements
  const checkFirstBubble = async () => {
    try {
      // Get bubbles created by the user
      const { data, error } = await supabase
        .from("bubbles")
        .select("id")
        .eq("username", user?.email || "")
        .limit(1);

      if (error) throw error;

      // If the user has created at least one bubble, unlock the achievement
      if (data && data.length > 0) {
        await checkAchievement('first-bubble');
      }
    } catch (error) {
      console.error("Error checking first bubble achievement:", error);
    }
  };
  
  const trackMessages = async () => {
    try {
      // Get message count for the user
      const { data, error } = await supabase
        .from("bubble_messages")
        .select("id")
        .eq("username", user?.email || "");

      if (error) throw error;

      // Update achievement progress for social butterfly
      if (data) {
        const messageCount = data.length;
        
        // Find current achievement to check its progress
        const socialButterfly = achievements.find(a => a.id === 'social-butterfly');
        
        // Only update if the new count is higher than existing progress
        if (socialButterfly && (!socialButterfly.progress || messageCount > socialButterfly.progress)) {
          await incrementAchievementProgress('social-butterfly', messageCount);
        }
      }
    } catch (error) {
      console.error("Error tracking messages for Social Butterfly achievement:", error);
    }
  };
  
  const trackReflections = async () => {
    try {
      // Get unique bubble reflections by this user
      const { data, error } = await supabase
        .from("reflects")
        .select("bubble_id")
        .eq("username", user?.email || "");

      if (error) throw error;

      if (data) {
        // Get unique reflection count
        const uniqueBubbles = new Set(data.map(reflection => reflection.bubble_id));
        const reflectionCount = uniqueBubbles.size;
        
        // Find current achievement to check its progress
        const reflectionMaster = achievements.find(a => a.id === 'reflection-master');
        
        // Only update if the new count is higher than existing progress
        if (reflectionMaster && (!reflectionMaster.progress || reflectionCount > reflectionMaster.progress)) {
          await incrementAchievementProgress('reflection-master', reflectionCount);
        }
      }
    } catch (error) {
      console.error("Error tracking reflections for Reflection Master achievement:", error);
    }
  };
  
  const trackPopularBubbles = async () => {
    try {
      // Get bubbles created by this user with 5+ reflections
      const { data, error } = await supabase
        .from("bubbles")
        .select("id, reflect_count")
        .eq("username", user?.email || "")
        .gte("reflect_count", 5)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // If any popular bubble exists, unlock the achievement
        await checkAchievement('popular-bubble');
      }
    } catch (error) {
      console.error("Error tracking popular bubbles achievement:", error);
    }
  };
  
  // This component doesn't render anything
  return null;
};

export default GamificationTracker;
