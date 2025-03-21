
import React, { useEffect, useState } from "react";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BubbleMessage, Reflect, Bubble } from "@/types/bubble";

// This component should be included in a main layout component 
// to track achievements without adding any visual elements
const GamificationTracker: React.FC = () => {
  const { user } = useAuth();
  const { 
    refreshGamificationProfile, 
    checkAchievement, 
    incrementAchievementProgress 
  } = useGamification();
  const [isMounted, setIsMounted] = useState(false);
  
  // Use the login streak hook
  useLoginStreak();
  
  // Refresh profile on mount
  useEffect(() => {
    if (user) {
      refreshGamificationProfile();
      setIsMounted(true);
    }
  }, [user, refreshGamificationProfile]);

  // Track Social Butterfly achievement (message count)
  useEffect(() => {
    if (!user || !isMounted) return;

    const trackMessages = async () => {
      try {
        // Get message count for the user
        const { data, error } = await supabase
          .from("bubble_messages")
          .select("id")
          .eq("username", user.email)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Update achievement progress for social butterfly
        if (data) {
          const messageCount = data.length;
          await incrementAchievementProgress('social-butterfly', messageCount);
        }
      } catch (error) {
        console.error("Error tracking messages for Social Butterfly achievement:", error);
      }
    };

    trackMessages();
  }, [user, isMounted, incrementAchievementProgress]);

  // Track Reflection Master achievement
  useEffect(() => {
    if (!user || !isMounted) return;

    const trackReflections = async () => {
      try {
        // Get unique bubble reflections by this user
        const { data, error } = await supabase
          .from("reflects")
          .select("bubble_id")
          .eq("username", user.email);

        if (error) throw error;

        if (data) {
          // Get unique reflection count
          const uniqueBubbles = new Set(data.map(reflection => reflection.bubble_id));
          await incrementAchievementProgress('reflection-master', uniqueBubbles.size);
        }
      } catch (error) {
        console.error("Error tracking reflections for Reflection Master achievement:", error);
      }
    };

    trackReflections();
  }, [user, isMounted, incrementAchievementProgress]);

  // Track Popular Bubble achievement
  useEffect(() => {
    if (!user || !isMounted) return;

    const trackPopularBubbles = async () => {
      try {
        // Get bubbles created by this user with 5+ reflections
        const { data, error } = await supabase
          .from("bubbles")
          .select("id, reflect_count")
          .eq("username", user.email)
          .gte("reflect_count", 5)
          .order("reflect_count", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // If any popular bubble exists, unlock the achievement
          await checkAchievement('popular-bubble', 5);
        }
      } catch (error) {
        console.error("Error tracking popular bubbles achievement:", error);
      }
    };

    trackPopularBubbles();
  }, [user, isMounted, checkAchievement]);
  
  // This component doesn't render anything
  return null;
};

export default GamificationTracker;
