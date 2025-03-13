
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useGamification } from "@/context/GamificationContext";
import { GamificationContextType } from "@/types/gamification";

/**
 * Hook for reflecting on a bubble.
 */
export const useReflectOnBubble = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isReflecting, setIsReflecting] = useState(false);
  const { incrementAchievementProgress, addPoints, refreshGamificationProfile } = useGamification() as GamificationContextType;

  /**
   * Reflects on a bubble with the given id.
   * @param bubbleId - The ID of the bubble to reflect on.
   * @param username - The username of the user reflecting on the bubble.
   */
  const reflectOnBubble = async (bubbleId: string, username: string) => {
    if (isReflecting) return;
    
    setIsReflecting(true);
    
    try {
      // Insert reflection record in Supabase
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
        } else {
          throw error;
        }
      } else {
        // Award points and track achievement
        await addPoints(10, 'reflection');
        await incrementAchievementProgress('reflection-master', 1);
        await refreshGamificationProfile();
        
        toast({
          title: "Bubble reflected!",
          description: "This bubble will appear in your profile",
        });
        
        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ['bubbles'] });
        queryClient.invalidateQueries({ queryKey: ['myBubbles'] });
      }
    } catch (error) {
      console.error("Error reflecting on bubble:", error);
      toast({
        title: "Error reflecting on bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsReflecting(false);
    }
  };

  return {
    reflectOnBubble,
    isReflecting
  };
};
