
import { BubbleData } from "@/types/bubble";

// Function to calculate and assign circular positions for each bubble
export const calculateCircularPositions = (bubbles: BubbleData[], containerWidth: number, containerHeight: number): BubbleData[] => {
  if (!bubbles || bubbles.length === 0) {
    console.log("No bubbles to position");
    return [];
  }
  
  console.log(`Calculating positions for ${bubbles.length} bubbles in a container of ${containerWidth}×${containerHeight}`);
  
  // Calculate the radius of the circle (35% of the smallest dimension to leave space around edges)
  const circleRadius = Math.min(containerWidth, containerHeight) * 0.35;
  
  // Calculate the center of the container
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  
  // Position each bubble around the circle
  return bubbles.map((bubble, index) => {
    // Calculate the angle for this bubble (evenly distributed)
    const angle = (index / bubbles.length) * 2 * Math.PI;
    
    // Calculate x and y coordinates
    const x = centerX + circleRadius * Math.cos(angle);
    const y = centerY + circleRadius * Math.sin(angle);
    
    // Return the bubble with position data
    return {
      ...bubble,
      x, 
      y,
      angle, // Store the angle for animation
      radius: circleRadius, // Store the original radius for animation
    };
  });
};

// Function to create floating effect by slightly adjusting positions
export const calculateFloatingPositions = (
  initialPositions: BubbleData[], 
  time: number, 
  floatingRadius: number = 10
): BubbleData[] => {
  if (!initialPositions || initialPositions.length === 0) {
    return [];
  }
  
  return initialPositions.map((bubble) => {
    // Check if the required properties exist before using them
    if (typeof bubble.x !== 'number' || typeof bubble.y !== 'number') {
      return bubble;
    }
    
    // Safe access angle and radius with defaults if they don't exist
    const angle = bubble.angle || 0;
    const baseRadius = bubble.radius || 0;
    
    // Create a floating effect with sine and cosine
    const floatX = Math.sin(time / 2000 + (angle || 0) * 0.5) * floatingRadius;
    const floatY = Math.cos(time / 2000 + (angle || 0) * 0.7) * floatingRadius;
    
    return {
      ...bubble,
      x: bubble.x + floatX,
      y: bubble.y + floatY,
    };
  });
};

// Function to get bubble color based on topic
export const getBubbleColor = (topic: string): string => {
  // Simple hash function to convert string to a number
  const hash = Array.from(topic).reduce(
    (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
  );
  
  // List of vibrant colors
  const colors = [
    '#FF5A5F', // Coral
    '#00A699', // Turquoise
    '#FC642D', // Orange
    '#8F7DFF', // Purple
    '#00C8B0', // Teal
    '#FF9A5A', // Light Orange
    '#7B61FF', // Blue-Purple
    '#FF7675', // Salmon
    '#6C5CE7', // Blue
    '#FF6B6B', // Red
  ];
  
  // Use the hash to pick a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

// Format the time until bubble expiry
export const formatExpiryTime = (expiryTime: string): string => {
  try {
    const expiry = new Date(expiryTime);
    const now = new Date();
    
    // Get time difference in milliseconds
    const diff = expiry.getTime() - now.getTime();
    
    // If the bubble has expired
    if (diff <= 0) {
      return "Expired";
    }
    
    // Convert to days, hours
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  } catch (e) {
    console.error("Error formatting expiry time:", e);
    return "Unknown";
  }
};
