
// Format time remaining for bubble display
export const formatTimeRemaining = (expiryTime: Date): string => {
  try {
    const now = new Date();
    const timeDiff = expiryTime.getTime() - now.getTime();
    if (timeDiff <= 0) return "Expired";
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error formatting time remaining:", error);
    return "Time error";
  }
};

// Helper function to ensure size is one of the allowed values
export const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  // Default to 'md' if size is not valid
  return 'md';
};
