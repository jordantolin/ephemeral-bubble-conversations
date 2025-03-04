
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
