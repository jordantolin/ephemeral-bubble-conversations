
/**
 * Utility functions for bubble operations
 */

// Helper function to ensure size is one of the allowed values
export const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  // Default to 'md' if size is not valid
  return 'md';
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

// Check if a bubble is expired
export const isBubbleExpired = (expiryDate: string): boolean => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  return now > expiry;
};

// Calculate time remaining until expiry
export const getTimeRemaining = (expiryDate: string): {hours: number, minutes: number} => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0 };
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
};
