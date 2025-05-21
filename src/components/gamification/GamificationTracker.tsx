
import React, { useEffect, useState } from "react";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// This component should be included in a main layout component 
// to track achievements without adding any visual elements
const GamificationTracker: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    refreshGamificationProfile, 
    checkAchievement, 
    incrementAchievementProgress,
    addPoints
  } = useGamification();
  const [isMounted, setIsMounted] = useState(false);
  const [hasTrackedInitialData, setHasTrackedInitialData] = useState(false);
  
  // Use the login streak hook
  useLoginStreak();
  
  // Refresh profile on mount
  useEffect(() => {
    if (user) {
      refreshGamificationProfile().catch((error) => {
        console.error("Error refreshing gamification profile:", error);
      });
      setIsMounted(true);
    }
  }, [user, refreshGamificationProfile]);

  // Track achievements
  useEffect(() => {
    if (!user || !isMounted || hasTrackedInitialData) return;

    const trackInitialData = async () => {
      try {
        // 1. Track message count for Social Butterfly achievement
        const { data: messageData, error: messageError } = await supabase
          .from("bubble_messages")
          .select("id")
          .eq("username", user.email)
          .order("created_at", { ascending: false });

        if (messageError) {
          console.error("Error tracking messages for Social Butterfly achievement:", messageError);
        } else if (messageData && Array.isArray(messageData)) {
          const messageCount = messageData.length;
          await incrementAchievementProgress('social-butterfly', messageCount);
        }

        // 2. Track reflection count for Reflection Master achievement
        const { data: reflectionData, error: reflectionError } = await supabase
          .from("reflects")
          .select("bubble_id")
          .eq("username", user.email)
          .order("created_at", { ascending: false });

        if (reflectionError) {
          console.error("Error tracking reflections for Reflection Master achievement:", reflectionError);
        } else if (reflectionData && Array.isArray(reflectionData)) {
          // Count unique bubbles reflected
          const uniqueBubbleIds = new Set(reflectionData.map(r => r.bubble_id));
          const reflectionCount = uniqueBubbleIds.size;
          await incrementAchievementProgress('reflection-master', reflectionCount);
        }

        // 3. Check if user has created any bubbles for First Bubble achievement
        const { data: bubbleData, error: bubbleError } = await supabase
          .from("bubbles")
          .select("id")
          .eq("username", user.email)
          .limit(1);

        if (bubbleError) {
          console.error("Error checking for First Bubble achievement:", bubbleError);
        } else if (bubbleData && bubbleData.length > 0) {
          await checkAchievement('first-bubble');
        }

        // 4. Check for popular bubble achievement (bubbles with 5+ reflections)
        const { data: popularBubbleData, error: popularBubbleError } = await supabase
          .from("bubbles")
          .select("id, reflect_count")
          .eq("username", user.email)
          .gte("reflect_count", 5)
          .limit(1);

        if (popularBubbleError) {
          console.error("Error checking for Popular Bubble achievement:", popularBubbleError);
        } else if (popularBubbleData && popularBubbleData.length > 0) {
          await checkAchievement('popular-bubble');
        }
        
        // Once all tracking is done, update the flag
        setHasTrackedInitialData(true);
      } catch (error) {
        console.error("Error in tracking initial achievements:", error);
      }
    };

    // Don't block on these tracking operations
    trackInitialData().catch(error => {
      console.error("Error in trackInitialData:", error);
    });
    
  }, [user, isMounted, incrementAchievementProgress, checkAchievement, hasTrackedInitialData]);

  // This component doesn't render anything
  return null;
};

export default GamificationTracker;
