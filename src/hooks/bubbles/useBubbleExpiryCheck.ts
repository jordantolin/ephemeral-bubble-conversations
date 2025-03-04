
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook for checking bubble expiry and triggering explosion animations
 */
export const useBubbleExpiryCheck = (bubbles: any[]) => {
  const queryClient = useQueryClient();
  const [explodingBubbleId, setExplodingBubbleId] = useState<string | null>(null);

  // Handle bubble explosion animation and removal
  useEffect(() => {
    const checkForExpiringBubbles = () => {
      bubbles.forEach(bubble => {
        if (!bubble || !bubble.expires_at) return;
        
        try {
          const expiryTime = new Date(bubble.expires_at);
          const now = new Date();
          const timeLeft = expiryTime.getTime() - now.getTime();
          
          // If bubble is about to expire in the next minute, trigger animation
          if (timeLeft > 0 && timeLeft < 60000 && explodingBubbleId !== bubble.id) {
            setExplodingBubbleId(bubble.id);
            
            // After 5 seconds, refresh the bubble list to update the UI
            setTimeout(() => {
              setExplodingBubbleId(null);
              queryClient.invalidateQueries({ queryKey: ['bubbles'] });
            }, 5000);
          }
        } catch (error) {
          console.error("Error calculating bubble expiry:", error);
        }
      });
    };
    
    // Check for expiring bubbles every 10 seconds
    const interval = setInterval(checkForExpiringBubbles, 10000);
    
    return () => clearInterval(interval);
  }, [bubbles, explodingBubbleId, queryClient]);

  return {
    explodingBubbleId
  };
};

export default useBubbleExpiryCheck;
