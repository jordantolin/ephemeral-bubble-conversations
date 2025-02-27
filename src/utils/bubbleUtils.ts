
import * as THREE from 'three';

// Optimize geometry creation for better performance
export const createBubbleGeometry = (size: number) => {
  // Use fewer segments for better performance across many bubbles
  const segments = Math.max(16, Math.min(32, Math.floor(size * 32)));
  return new THREE.SphereGeometry(size, segments, segments);
};

export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    transparent: true,
    opacity: 0.7,
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.3,
    clearcoat: 1.0,
    depthWrite: true,
    side: THREE.FrontSide // FrontSide for better performance
  });
};

export const createCentralWorldGeometry = () => {
  return new THREE.SphereGeometry(2, 32, 32);
};

export const createCentralWorldMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    transparent: true,
    opacity: 0.2,
    metalness: 0.1,
    roughness: 0.5,
    transmission: 0.1,
    depthWrite: true
  });
};

export const createTextCanvas = (text: string, fontSize: number = 32) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'transparent';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add stroke for better visibility
  context.strokeStyle = '#000000';
  context.lineWidth = 4;
  context.strokeText(text, canvas.width/2, canvas.height/2);
  
  context.fillStyle = '#FFFFFF';
  context.fillText(text, canvas.width/2, canvas.height/2);
  
  return canvas;
};

// Connection management for real-time updates
export const connectionManager = {
  channels: new Map<string, any>(),
  
  createChannel: async (supabase: any, channelName: string, filters: any[], callback: (payload: any) => void) => {
    // Check if channel already exists
    if (connectionManager.channels.has(channelName)) {
      return connectionManager.channels.get(channelName);
    }
    
    try {
      // Create channel with optimized configuration
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          retryIntervalMs: 5000,
          timeout: 10000
        }
      });
      
      // Add filters
      filters.forEach(filter => {
        channel.on(
          'postgres_changes',
          filter,
          (payload: any) => {
            console.log(`[${channelName}] Event received:`, filter.event);
            callback(payload);
          }
        );
      });
      
      // Subscribe with error handling
      const status = await new Promise<string>((resolve) => {
        channel.subscribe((status: string) => {
          console.log(`[${channelName}] Status: ${status}`);
          resolve(status);
        });
      });
      
      if (status === 'SUBSCRIBED') {
        connectionManager.channels.set(channelName, channel);
        return channel;
      } else {
        throw new Error(`Channel subscription failed with status: ${status}`);
      }
      
    } catch (error) {
      console.error(`[${channelName}] Channel creation error:`, error);
      throw error;
    }
  },
  
  removeChannel: async (supabase: any, channelName: string) => {
    const channel = connectionManager.channels.get(channelName);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
        connectionManager.channels.delete(channelName);
        console.log(`[${channelName}] Channel removed successfully`);
        return true;
      } catch (error) {
        console.error(`[${channelName}] Channel removal error:`, error);
        connectionManager.channels.delete(channelName); // Remove from map anyway
        return false;
      }
    }
    return false;
  },
  
  removeAllChannels: async (supabase: any) => {
    const promises: Promise<boolean>[] = [];
    connectionManager.channels.forEach((_, channelName) => {
      promises.push(connectionManager.removeChannel(supabase, channelName));
    });
    await Promise.allSettled(promises);
    connectionManager.channels.clear();
  }
};

// Rate limiting utility for message sending
// Helps prevent flooding the server
export const createRateLimiter = (maxRequests: number = 5, timeWindowMs: number = 5000) => {
  let requestTimestamps: number[] = [];
  
  return {
    canMakeRequest: () => {
      const now = Date.now();
      // Remove timestamps outside the window
      requestTimestamps = requestTimestamps.filter(
        timestamp => now - timestamp < timeWindowMs
      );
      
      // Check if we can make another request
      if (requestTimestamps.length < maxRequests) {
        requestTimestamps.push(now);
        return true;
      }
      
      return false;
    },
    
    getWaitTime: () => {
      if (requestTimestamps.length === 0) return 0;
      const now = Date.now();
      const oldestAllowedTime = now - timeWindowMs;
      
      if (requestTimestamps.length < maxRequests) return 0;
      
      const waitTime = requestTimestamps[0] - oldestAllowedTime;
      return Math.max(0, waitTime);
    },
    
    reset: () => {
      requestTimestamps = [];
    }
  };
};

// Retry utility for network operations
export const createRetryHandler = (maxRetries: number = 3, initialDelayMs: number = 1000) => {
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Operation failed, retrying (${attempt + 1}/${maxRetries})`, error);
        
        // Exponential backoff
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
};
