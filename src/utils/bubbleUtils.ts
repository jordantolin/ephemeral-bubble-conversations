
import * as THREE from 'three';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Collection of active channels for better management
const activeChannels: { [key: string]: RealtimeChannel } = {};

// Connection manager to handle Supabase realtime subscriptions
export const connectionManager = {
  // Create a new realtime subscription channel
  createChannel: async (
    supabase: SupabaseClient,
    channelName: string,
    filters: any[],
    onChangeCallback: (payload: any) => void
  ): Promise<void> => {
    try {
      // Clean up existing channel with the same name if it exists
      if (activeChannels[channelName]) {
        await connectionManager.removeChannel(supabase, channelName);
      }
      
      // Create a new channel with the given filters
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', filters, onChangeCallback)
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error(`Channel ${channelName} subscription status: ${status}`);
          }
        });
      
      // Store the channel reference
      activeChannels[channelName] = channel;
      
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      throw error;
    }
  },
  
  // Remove a single channel by name
  removeChannel: async (
    supabase: SupabaseClient,
    channelName: string
  ): Promise<void> => {
    try {
      if (activeChannels[channelName]) {
        await supabase.removeChannel(activeChannels[channelName]);
        delete activeChannels[channelName];
      }
    } catch (error) {
      console.error(`Error removing channel ${channelName}:`, error);
    }
  },
  
  // Remove all active channels
  removeAllChannels: async (
    supabase: SupabaseClient
  ): Promise<void> => {
    try {
      await Promise.all(
        Object.keys(activeChannels).map((channelName) => 
          connectionManager.removeChannel(supabase, channelName)
        )
      );
    } catch (error) {
      console.error("Error removing all channels:", error);
    }
  }
};

// Rate limiter for message sending
export const createRateLimiter = (
  maxRequests: number,
  timeWindow: number
) => {
  const requestTimestamps: number[] = [];
  
  return {
    canMakeRequest: (): boolean => {
      const now = Date.now();
      
      // Remove timestamps outside the window
      while (
        requestTimestamps.length > 0 &&
        requestTimestamps[0] < now - timeWindow
      ) {
        requestTimestamps.shift();
      }
      
      // Check if we can make more requests
      if (requestTimestamps.length < maxRequests) {
        requestTimestamps.push(now);
        return true;
      }
      
      return false;
    },
    
    getWaitTime: (): number => {
      if (requestTimestamps.length === 0) return 0;
      
      const now = Date.now();
      const oldestTimestamp = requestTimestamps[0];
      const timeToWait = (oldestTimestamp + timeWindow) - now;
      
      return Math.max(0, timeToWait);
    },
    
    reset: () => {
      requestTimestamps.length = 0;
    }
  };
};

// Retry handler for network operations
export const createRetryHandler = (
  maxRetries: number,
  baseDelay: number
) => {
  return async (
    operation: () => Promise<any>
  ): Promise<any> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(1.5, attempt) * (0.9 + Math.random() * 0.2);
        
        console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
};

// Create bubble geometry with improved quality
export const createBubbleGeometry = (size: number) => {
  const segments = Math.max(16, Math.floor(size * 24)); // Higher detail for larger bubbles
  return new THREE.SphereGeometry(size, segments, segments);
};

// Create bubble material with improved appearance
export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    metalness: 0,
    roughness: 0.1,
    transmission: 0.6,
    reflectivity: 0.5,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
};

// Create central world geometry
export const createCentralWorldGeometry = () => {
  const geometry = new THREE.IcosahedronGeometry(0.8, 1);
  // Add some randomization to vertices for a more organic look
  const positions = geometry.attributes.position;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    const jitter = 0.05;
    positions.setXYZ(
      i,
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
      z + (Math.random() - 0.5) * jitter
    );
  }
  
  geometry.computeVertexNormals();
  return geometry;
};

// Create central world material with improved appearance
export const createCentralWorldMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    metalness: 0.4,
    roughness: 0.3,
    transmission: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.2,
    emissive: 0x332200,
    emissiveIntensity: 0.2,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
};

// Create text canvas with improved readability
export const createTextCanvas = (text: string, fontSize: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;
  
  // Set canvas size
  canvas.width = 512;
  canvas.height = 256;
  
  // Clear canvas
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Configure text style
  const scaleFactor = fontSize / 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Text shadow for better readability
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4 * scaleFactor;
  ctx.shadowOffsetX = 2 * scaleFactor;
  ctx.shadowOffsetY = 2 * scaleFactor;
  
  // Text styling
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#ebbd34';
  
  // Center text and ensure all text is visible
  const maxWidth = canvas.width * 0.9; // Limit width to avoid cutoff
  const words = text.split(' ');
  
  // Single line approach for shorter text
  if (words.length <= 3 || text.length <= 20) {
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, maxWidth);
  } else {
    // Multi-line approach for longer text
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine); // Add the last line
    
    // Calculate total height of text block
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
    
    // Render each line
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + index * lineHeight, maxWidth);
    });
  }
  
  return canvas;
};
