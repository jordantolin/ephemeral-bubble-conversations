
import { SupabaseClient } from '@supabase/supabase-js';
import * as THREE from 'three';

// Enhanced real-time connection management
export const connectionManager = {
  activeChannels: new Map(),

  createChannel: async (
    supabase: SupabaseClient,
    channelName: string,
    filters: any[],
    callback: (payload?: any) => void
  ) => {
    try {
      // Clean up any existing channel with the same name
      if (connectionManager.activeChannels.has(channelName)) {
        await connectionManager.removeChannel(supabase, channelName);
      }

      // Create a new channel
      const channel = supabase.channel(channelName);

      // Apply all filters
      filters.forEach(filter => {
        channel.on(
          'postgres_changes',
          filter,
          (payload) => {
            console.log(`Realtime update received for ${filter.table}:`, payload);
            if (callback) callback(payload);
          }
        );
      });

      // Subscribe to the channel
      const status = await channel.subscribe((status) => {
        console.log(`Channel ${channelName} status:`, status);
        
        // Retry connection if it fails
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => {
            console.log(`Attempting to reconnect channel ${channelName}...`);
            channel.subscribe();
          }, 5000);
        }
      });

      // Store the channel for later cleanup
      connectionManager.activeChannels.set(channelName, channel);
      console.log(`Channel ${channelName} created with status:`, status);
      
      return status;
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      throw error;
    }
  },

  removeChannel: async (supabase: SupabaseClient, channelName: string) => {
    try {
      if (connectionManager.activeChannels.has(channelName)) {
        const channel = connectionManager.activeChannels.get(channelName);
        await supabase.removeChannel(channel);
        connectionManager.activeChannels.delete(channelName);
        console.log(`Channel ${channelName} removed`);
      }
    } catch (error) {
      console.error(`Error removing channel ${channelName}:`, error);
    }
  },

  removeAllChannels: async (supabase: SupabaseClient) => {
    try {
      const promises = Array.from(connectionManager.activeChannels.entries()).map(
        async ([channelName, channel]) => {
          await supabase.removeChannel(channel);
          console.log(`Channel ${channelName} removed`);
        }
      );
      
      await Promise.all(promises);
      connectionManager.activeChannels.clear();
      console.log('All channels removed');
    } catch (error) {
      console.error('Error removing all channels:', error);
    }
  }
};

// Rate limiter for message sending
export const createRateLimiter = (maxRequests: number, timeWindowMs: number) => {
  const timestamps: number[] = [];
  
  return {
    canMakeRequest: () => {
      const now = Date.now();
      
      // Remove timestamps outside the time window
      const validTimestamps = timestamps.filter(
        timestamp => now - timestamp < timeWindowMs
      );
      
      // Update timestamps array
      timestamps.length = 0;
      timestamps.push(...validTimestamps);
      
      // Check if under the limit
      if (timestamps.length < maxRequests) {
        timestamps.push(now);
        return true;
      }
      
      return false;
    },
    
    getWaitTime: () => {
      if (timestamps.length < maxRequests) return 0;
      
      const now = Date.now();
      const oldestTimestamp = timestamps[0];
      const timeToWait = timeWindowMs - (now - oldestTimestamp);
      
      return Math.max(0, timeToWait);
    },
    
    reset: () => {
      timestamps.length = 0;
    }
  };
};

// Retry handler for network operations
export const createRetryHandler = (maxRetries: number, baseDelayMs: number) => {
  return async (operation: () => Promise<any>) => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          // Use exponential backoff with jitter
          const delay = baseDelayMs * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
          console.log(`Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we've exhausted all retries, throw the last error
    throw lastError;
  };
};

// Create a queue for operations to prevent conflicts in concurrent use
export const optimizeConcurrentOperations = () => {
  let operationQueue: Promise<any> = Promise.resolve();
  
  return {
    enqueue: async <T>(operation: () => Promise<T>): Promise<T> => {
      // Chain operations sequentially to prevent conflicts
      operationQueue = operationQueue
        .then(() => operation())
        .catch(error => {
          console.error('Operation failed:', error);
          throw error;
        });
      
      return operationQueue as Promise<T>;
    },
    
    clearQueue: () => {
      operationQueue = Promise.resolve();
    }
  };
};

// --------- 3D Visualization Utilities for BubbleWorld ---------

// Creates a bubble geometry with optimized parameters
export const createBubbleGeometry = (size: number = 1) => {
  // Use icosahedron for smoother spheres with good performance
  return new THREE.IcosahedronGeometry(size, 5);
};

// Creates a bubble material with visually appealing effects
export const createBubbleMaterial = () => {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xebbd34, // Gold color to match the app theme
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.5, // Some transparency
    thickness: 0.5, // Glass-like refraction
    clearcoat: 1.0, // Extra shine layer
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.8,
    emissive: 0xebbd34,
    emissiveIntensity: 0.2,
  });
  
  return material;
};

// Creates the central world geometry that anchors the bubble visualization
export const createCentralWorldGeometry = () => {
  // Use icosahedron for the central world as well, more subdivided for smoothness
  return new THREE.IcosahedronGeometry(2, 6);
};

// Creates the material for the central world object
export const createCentralWorldMaterial = () => {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xebbd34, // Gold color to match the app theme
    metalness: 0.3,
    roughness: 0.4,
    transmission: 0.2,
    thickness: 1.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.6,
    emissive: 0xebbd34,
    emissiveIntensity: 0.3,
  });
  
  return material;
};

// Creates a text canvas for labeling bubbles, ensuring all text is in English
export const createTextCanvas = (text: string, fontSize: number = 32) => {
  // Validate and ensure text is in English if possible
  // For now we'll just use the text as-is, but add proper English font settings
  const canvas = document.createElement('canvas');
  const size = 256; // Power of 2 for best texture performance
  canvas.width = size * 2;
  canvas.height = size;
  
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  
  // Clear canvas with transparency
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set text properties with English-friendly font
  context.font = `bold ${fontSize}px 'Arial', 'Helvetica', sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Force English locale for text rendering
  try {
    // @ts-ignore - Using locale option for fillText if supported
    context.textLocale = 'en-US';
  } catch (e) {
    // Ignore if not supported
  }
  
  // Draw text shadow for better readability
  context.fillStyle = 'rgba(0, 0, 0, 0.4)';
  context.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
  
  // Draw main text
  context.fillStyle = 'white';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};
