
import { useCallback } from "react";

/**
 * Hook providing utility functions for bubble operations
 */
export const useBubbleUtils = () => {
  // Function to check if a bubble is expired (more than 24 hours old)
  const isBubbleExpired = useCallback((bubble: any) => {
    if (!bubble || !bubble.expires_at) return true;
    
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      return expiryTime < now;
    } catch (error) {
      console.error("Error checking bubble expiry:", error);
      return true; // Consider expired on error to prevent issues
    }
  }, []);

  // Function to check if a bubble should be displayed in the feed
  // Shows non-expired bubbles and bubbles that expired less than 24 hours ago
  const shouldShowInFeed = useCallback((bubble: any) => {
    if (!bubble || !bubble.expires_at) return false;
    
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      
      // If not expired, show it
      if (expiryTime > now) return true;
      
      // If expired, check if it's within 24h after expiration
      const cutoffTime = new Date(expiryTime);
      cutoffTime.setHours(cutoffTime.getHours() + 24);
      
      return now < cutoffTime;
    } catch (error) {
      console.error("Error checking bubble visibility:", error);
      return false;
    }
  }, []);

  return {
    isBubbleExpired,
    shouldShowInFeed
  };
};

// Helper function to ensure size is one of the allowed values
export const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  // Default to 'sm' if size is not valid
  return 'sm';
};

export default useBubbleUtils;
