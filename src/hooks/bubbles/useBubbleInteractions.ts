
import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useBubbleUtils } from "./useBubbleUtils";

/**
 * Hook for managing bubble interactions (reflect, click, etc.)
 */
export const useBubbleInteractions = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isBubbleExpired } = useBubbleUtils();

  // Optimized bubble reflection with retry logic
  const handleReflect = useCallback(async (bubbleId: string, bubbles: any[]) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    // Find the bubble to check if it's expired
    const bubble = bubbles.find(b => b.id === bubbleId);
    
    if (!bubble || (bubble && isBubbleExpired(bubble))) {
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available for reflection",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const username = profile?.username || user?.email || "";
      
      const sendRetry = {
        current: async (callback: () => Promise<void>) => {
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              await callback();
              return;
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }
      };
      
      await sendRetry.current(async () => {
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
              description: "You have already reflected this bubble",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "Bubble reflected!",
          description: "This bubble will appear in your profile",
        });
        
        // Invalidate My Bubbles query to show the newly reflected bubble
        queryClient.invalidateQueries({ queryKey: ['myBubbles', profile?.username] });
      });
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [user, profile, toast, isBubbleExpired, queryClient]);

  // Handle bubble click to navigate to bubble chat page
  const handleBubbleClick = useCallback((bubbleId: string, bubbles: any[]) => {
    // Find bubble to check if it's expired
    const bubble = bubbles.find(b => b.id === bubbleId);
    
    if (!bubble) {
      toast({
        title: "Bubble Not Found",
        description: "This bubble may have been deleted",
        variant: "destructive"
      });
      return;
    }
    
    // Navigate to the bubble's chat page (even if expired, as we still want to show it)
    navigate(`/bubble/${bubbleId}`);
  }, [navigate, toast]);

  return {
    handleReflect,
    handleBubbleClick
  };
};

export default useBubbleInteractions;
