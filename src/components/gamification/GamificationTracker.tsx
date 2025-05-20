
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
    incrementAchievementProgress 
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

  // Track Social Butterfly achievement (message count)
  useEffect(() => {
    if (!user || !isMounted || hasTrackedInitialData) return;

    const trackMessages = async () => {
      try {
        // Get message count for the user
        const { data, error } = await supabase
          .from("bubble_messages")
          .select("id")
          .eq("username", user.email)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error tracking messages for Social Butterfly achievement:", error);
          return;
        }

        // Update achievement progress for social butterfly
        if (data && Array.isArray(data)) {
          const messageCount = data.length;
          await incrementAchievementProgress('social-butterfly', messageCount);
        }
      } catch (error) {
        console.error("Error tracking messages for Social Butterfly achievement:", error);
      }
    };

    // Don't block on these tracking operations
    trackMessages().catch(error => {
      console.error("Error in tracking messages:", error);
    });
    
    setHasTrackedInitialData(true);
  }, [user, isMounted, incrementAchievementProgress, hasTrackedInitialData]);

  // This component doesn't render anything
  return null;
};

export default GamificationTracker;
