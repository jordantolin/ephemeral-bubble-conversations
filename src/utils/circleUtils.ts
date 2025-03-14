
import { BubbleData } from "@/types/bubble";

/**
 * Calculates positions for bubbles in a circular layout
 * @param bubbles - Array of bubbles to position
 * @param containerWidth - Width of the container
 * @param containerHeight - Height of the container
 */
export const calculateCircularPositions = (
  bubbles: BubbleData[],
  containerWidth: number,
  containerHeight: number
): BubbleData[] => {
  if (!bubbles.length) return [];
  
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const radius = Math.min(containerWidth, containerHeight) * 0.4;
  
  return bubbles.map((bubble, index) => {
    const angle = (index / bubbles.length) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    return {
      ...bubble,
      x,
      y
    };
  });
};

/**
 * Get a color for a bubble based on its topic
 * @param topic - The bubble topic
 */
export const getBubbleColor = (topic: string): string => {
  // Generate a consistent color based on the topic string
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to a golden-yellow range color (variations of #ebbd34)
  const h = 45 + (hash % 15); // Golden hue with slight variations
  const s = 70 + (hash % 20); // Saturation variations
  const l = 55 + (hash % 10); // Lightness variations
  
  return `hsl(${h}, ${s}%, ${l}%)`;
};

/**
 * Format bubble expiration time to a readable string
 * @param expiresAt - Expiration timestamp
 */
export const formatExpiryTime = (expiresAt: string | undefined): string => {
  if (!expiresAt) return "Unknown";
  
  try {
    const expiryTime = new Date(expiresAt);
    const now = new Date();
    
    if (expiryTime < now) {
      return "Expired";
    }
    
    const diffMs = expiryTime.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs === 0) {
      return `${diffMins}m left`;
    }
    
    return `${diffHrs}h ${diffMins}m left`;
  } catch (e) {
    return "Unknown";
  }
};
