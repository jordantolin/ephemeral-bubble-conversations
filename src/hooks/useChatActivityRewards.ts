
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { awardPoints, checkBubbleAchievements, checkReflectionAchievements } from "@/utils/gamificationUtils";

// Hook to manage gamification rewards for chat activity
export const useChatActivityRewards = () => {
  const { user } = useAuth();
  const messageCountRef = useRef(0);
  
  // Award points for sending a message
  const rewardMessageSent = async () => {
    if (!user) return;
    
    // Award 10 points for each message
    await awardPoints(user.id, 10, 'message');
    
    // Track message count for achievements
    messageCountRef.current += 1;
    
    // Check for achievements based on message count
    if (messageCountRef.current === 1) {
      await awardPoints(user.id, 50, 'message'); // Bonus for first message
    } else if (messageCountRef.current === 10) {
      await awardPoints(user.id, 100, 'message'); // Bonus for 10th message
    } else if (messageCountRef.current === 50) {
      await awardPoints(user.id, 500, 'message'); // Bonus for 50th message
    }
  };
  
  // Award points for creating a bubble
  const rewardBubbleCreated = async (bubbleCount?: number) => {
    if (!user) return;
    
    // Award 100 points for creating a bubble
    await awardPoints(user.id, 100, 'bubble');
    
    // If bubble count is provided, check for achievements
    if (typeof bubbleCount === 'number') {
      await checkBubbleAchievements(user.id, bubbleCount);
    }
  };
  
  // Award points for reflecting a bubble
  const rewardReflection = async (reflectionCount?: number) => {
    if (!user) return;
    
    // Award 50 points for reflecting a bubble
    await awardPoints(user.id, 50, 'reflection');
    
    // If reflection count is provided, check for achievements
    if (typeof reflectionCount === 'number') {
      await checkReflectionAchievements(user.id, reflectionCount);
    }
  };
  
  return {
    rewardMessageSent,
    rewardBubbleCreated,
    rewardReflection
  };
};

export default useChatActivityRewards;
