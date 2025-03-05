
import * as THREE from 'three';

// Function to create bubble geometry
export const createBubbleGeometry = (size: number = 1) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

// Function to create bubble material
export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: '#ebbd34',
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.9,
    opacity: 0.4,
    transparent: true,
    side: THREE.DoubleSide,
    clearcoat: 1,
    clearcoatRoughness: 0.25
  });
};

// Function to create central world geometry
export const createCentralWorldGeometry = () => {
  return new THREE.IcosahedronGeometry(1, 3);
};

// Function to create central world material
export const createCentralWorldMaterial = () => {
  return new THREE.MeshStandardMaterial({
    color: '#a38025',
    emissive: '#a38025',
    emissiveIntensity: 0.1,
    roughness: 0.4,
    metalness: 0.1
  });
};

// Update the createTextCanvas function to ensure dark text for better readability
export const createTextCanvas = (text: string, fontSize: number = 32, textColor: string = '#000000') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  // Set canvas dimensions
  canvas.width = 512;
  canvas.height = 128;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set text properties for better readability
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add stronger text shadow for better readability
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw text with dark color (near black) for maximum readability
  ctx.fillStyle = textColor;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};

// Properly implemented rate limiter with parameters and methods
export const createRateLimiter = (maxRequests: number = 5, timeWindowMs: number = 5000) => {
  const requests: number[] = [];
  
  return {
    canMakeRequest: () => {
      const now = Date.now();
      // Remove requests older than the time window
      const validRequests = requests.filter(time => now - time < timeWindowMs);
      requests.length = 0;
      requests.push(...validRequests);
      
      // Check if we can make a new request
      if (requests.length < maxRequests) {
        requests.push(now);
        return true;
      }
      return false;
    },
    getWaitTime: () => {
      if (requests.length === 0) return 0;
      const now = Date.now();
      const oldestRequest = Math.min(...requests);
      const timeToWait = timeWindowMs - (now - oldestRequest);
      return Math.max(0, timeToWait);
    },
    checkLimit: () => true // Keeping for backward compatibility
  };
};

// Properly implemented retry handler with parameters
export const createRetryHandler = (maxAttempts: number = 3, delayMs: number = 1000) => {
  return {
    retry: async (fn: Function) => {
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        try {
          return await fn();
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, delayMs * attempts));
        }
      }
    }
  };
};

// Enhanced connection manager with channel support
export const connectionManager = {
  channels: new Map<string, any>(),
  isConnected: true,
  
  connect: () => {
    connectionManager.isConnected = true;
  },
  
  disconnect: () => {
    connectionManager.isConnected = false;
  },
  
  createChannel: async (supabase: any, channelName: string, filters: any[], callback: (payload: any) => void) => {
    try {
      // Create a Supabase channel
      const channel = supabase.channel(channelName);
      
      // Add each filter to the channel
      filters.forEach(filter => {
        channel.on('postgres_changes', filter, callback);
      });
      
      // Subscribe to the channel
      await channel.subscribe();
      
      // Store the channel for later cleanup
      connectionManager.channels.set(channelName, channel);
      
      return channel;
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      throw error;
    }
  },
  
  removeChannel: async (supabase: any, channelName: string) => {
    try {
      const channel = connectionManager.channels.get(channelName);
      if (channel) {
        await supabase.removeChannel(channel);
        connectionManager.channels.delete(channelName);
      }
    } catch (error) {
      console.error(`Error removing channel ${channelName}:`, error);
    }
  },
  
  removeAllChannels: async (supabase: any) => {
    try {
      for (const [channelName, channel] of connectionManager.channels.entries()) {
        await supabase.removeChannel(channel);
        connectionManager.channels.delete(channelName);
      }
    } catch (error) {
      console.error('Error removing all channels:', error);
    }
  }
};
