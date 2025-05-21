
/**
 * Safely checks if the browser is online
 * Works in both browser and server environments
 */
export function isBrowserOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  // Default to true in environments where online status can't be determined
  return true;
}

/**
 * Calculates exponential backoff time for retries
 * @param attempt - The current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 */
export function calculateBackoff(
  attempt: number, 
  baseDelay = 1000, 
  maxDelay = 30000
): number {
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt),
    maxDelay
  );
  // Add a small random amount to prevent synchronized retries
  return delay + (Math.random() * baseDelay * 0.1);
}

/**
 * Determines if a network error is likely due to connectivity issues
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Check for common network error patterns
  const errorString = String(error);
  const networkErrorPatterns = [
    'network',
    'connection',
    'offline',
    'timeout',
    'abort',
    'fetch failed',
    'failed to fetch',
  ];
  
  return networkErrorPatterns.some(pattern => 
    errorString.toLowerCase().includes(pattern)
  );
}
