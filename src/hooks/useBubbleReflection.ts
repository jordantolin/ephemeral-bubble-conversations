
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/context/GamificationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useBubbleReflection = () => {
  const [isReflecting, setIsReflecting] = useState(false);
  const { user, profile } = useAuth();
  const { addPoints, checkAchievement, incrementAchievementProgress } = useGamification();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle bubble reflection with retry logic and proper error handling
  const reflectOnBubble = async (bubbleId: string, bubbleName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return false;
    }
    
    // Prevent multiple reflections simultaneously
    if (isReflecting) return false;
    
    setIsReflecting(true);
    
    try {
      const username = profile?.username || user?.email || "";
      
      // Check if already reflected
      const { data: existingReflection, error: checkError } = await supabase
        .from('reflects')
        .select('id')
        .eq('bubble_id', bubbleId)
        .eq('username', username)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // Real error (not "no rows returned")
        throw checkError;
      }
      
      if (existingReflection) {
        toast({
          title: "Already reflected",
          description: "You have already reflected on this bubble",
        });
        return false;
      }
      
      // Create reflection with retry
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          const { error } = await supabase
            .from('reflects')
            .insert({ 
              bubble_id: bubbleId,
              username
            });

          if (error) {
            if (error.code === '23505') { // Unique violation
              toast({
                title: "Already reflected",
                description: "You have already reflected on this bubble",
              });
              return false;
            }
            throw error;
          }
          
          success = true;
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) throw err;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (success) {
        // Add points for the reflection
        await addPoints(10, 'reflection');
        
        // Increment progress for the reflection master achievement
        await incrementAchievementProgress('reflection-master');
        
        // Check if this created a notification for the bubble owner
        const { data: bubbleData } = await supabase
          .from('bubbles')
          .select('username, reflect_count')
          .eq('id', bubbleId)
          .single();
          
        // Check achievement for popular bubble if this was created by another user
        if (bubbleData && bubbleData.username !== username) {
          // If this bubble now has 5 or more reflections, create notification for bubble owner
          if (bubbleData.reflect_count >= 5) {
            try {
              // Call the check_popular_bubble_achievement function
              await supabase.rpc('check_popular_bubble_achievement', { 
                bubble_id: bubbleId,
                bubble_name: bubbleName
              });
            } catch (error) {
              console.error("Error checking popular bubble achievement:", error);
            }
          }
        }
        
        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ['bubbles'] });
        queryClient.invalidateQueries({ queryKey: ['bubble', bubbleId] });
        queryClient.invalidateQueries({ queryKey: ['myBubbles', profile?.username] });
        
        // Show success notification
        toast({
          title: "Bubble reflected!",
          description: "This bubble will appear in your profile",
        });
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsReflecting(false);
    }
  };
  
  return {
    reflectOnBubble,
    isReflecting
  };
};
