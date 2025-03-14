
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
    'net::ERR',
    'NetworkError',
  ];
  
  return networkErrorPatterns.some(pattern => 
    errorString.toLowerCase().includes(pattern)
  );
}

/**
 * Checks connection to a specific resource
 * @param url - URL to check connectivity against
 * @returns Promise resolving to a boolean indicating if the resource is reachable
 */
export async function checkResourceConnectivity(url: string = 'https://www.google.com'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.warn('Resource connectivity check failed:', error);
    return false;
  }
}
