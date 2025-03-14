import * as THREE from 'three';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { geoToCartesian } from './geoCoordinates';

// Get initials from a name or username
export const getInitials = (name: string): string => {
  if (!name) return '';
  
  if (name.includes('@')) {
    name = name.split('@')[0];
  }
  
  const parts = name.split(/[\s.-_]+/).filter(Boolean);
  
  if (parts.length === 0) return '';
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Collection of active channels for better management
const activeChannels: { [key: string]: RealtimeChannel } = {};

// Connection manager to handle Supabase realtime subscriptions
export const connectionManager = {
  createChannel: async (
    supabase: SupabaseClient,
    channelName: string,
    filters: any[],
    onChangeCallback: (payload: any) => void
  ): Promise<void> => {
    try {
      if (activeChannels[channelName]) {
        await connectionManager.removeChannel(supabase, channelName);
      }
      
      const channel = supabase.channel(channelName);
      
      filters.forEach(filter => {
        channel.on(
          'postgres_changes', 
          filter, 
          onChangeCallback
        );
      });
      
      channel.subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.error(`Channel ${channelName} subscription status: ${status}`);
        }
      });
      
      activeChannels[channelName] = channel;
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      throw error;
    }
  },
  
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
      
      while (
        requestTimestamps.length > 0 &&
        requestTimestamps[0] < now - timeWindow
      ) {
        requestTimestamps.shift();
      }
      
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
  const segments = Math.max(24, Math.floor(size * 32));
  return new THREE.SphereGeometry(size, segments, segments);
};

// Create Earth geometry
export const createEarthGeometry = (radius: number) => {
  const segments = 64;
  return new THREE.SphereGeometry(radius, segments, segments);
};

// Create Earth material with texture and fallback
export const createEarthMaterial = () => {
  try {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    
    const earthTexture = textureLoader.load('/lovable-uploads/earth-texture.jpg', 
      () => console.log("Earth texture loaded successfully"),
      undefined,
      (err) => {
        console.warn("Earth texture failed to load, using fallback", err);
      }
    );
    
    return new THREE.MeshPhysicalMaterial({
      map: earthTexture,
      metalness: 0.1,
      roughness: 0.8,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
    });
  } catch (error) {
    console.warn("Error creating Earth material, using fallback", error);
    
    return new THREE.MeshPhysicalMaterial({
      color: 0x2233ff,
      metalness: 0.1,
      roughness: 0.8,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
    });
  }
};

// Create bubble material with improved appearance and the correct bright yellow color
export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    emissive: 0x664400,
    emissiveIntensity: 0.2,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.6,
    reflectivity: 0.7,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
};

// Calculate bubble position based on geographic coordinates
export const calculateBubblePosition = (latitude: number, longitude: number, radius: number, bubbleSize: number) => {
  const position = geoToCartesian(latitude, longitude, radius + bubbleSize * 0.5);
  return position;
};

// Create text canvas with improved readability
export const createTextCanvas = (text: string, fontSize: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;
  
  canvas.width = 1024;
  canvas.height = 512;
  
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const scaleFactor = fontSize / 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6 * scaleFactor;
  ctx.shadowOffsetX = 2 * scaleFactor;
  ctx.shadowOffsetY = 2 * scaleFactor;
  
  ctx.font = `bold ${fontSize * 1.2}px Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  
  const maxWidth = canvas.width * 0.85;
  const words = text.split(' ');
  
  if (words.length <= 3 || text.length <= 20) {
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const padding = 20 * scaleFactor;
    const backgroundWidth = Math.min(textWidth + padding * 2, maxWidth);
    const backgroundHeight = fontSize * 1.5;
    
    roundRect(ctx, 
      canvas.width / 2 - backgroundWidth / 2, 
      canvas.height / 2 - backgroundHeight / 2,
      backgroundWidth, 
      backgroundHeight, 
      10 * scaleFactor);
      
    ctx.restore();
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, maxWidth);
  } else {
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
    lines.push(currentLine);
    
    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
    
    const padding = 15 * scaleFactor;
    const cornerRadius = 10 * scaleFactor;
    
    lines.forEach((line, index) => {
      const metrics = ctx.measureText(line);
      const textWidth = metrics.width;
      const backgroundWidth = Math.min(textWidth + padding * 2, maxWidth);
      const backgroundHeight = fontSize * 1.5;
      const y = startY + index * lineHeight;
      
      roundRect(ctx,
        canvas.width / 2 - backgroundWidth / 2,
        y - backgroundHeight / 2,
        backgroundWidth,
        backgroundHeight,
        cornerRadius);
    });
    
    ctx.restore();
    
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + index * lineHeight, maxWidth);
    });
  }
  
  return canvas;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

export const calculateDynamicBubbleSize = (
  totalBubbles: number,
  size: "sm" | "md" | "lg"
): number => {
  const baseSizeMap = {
    "sm": 0.15,
    "md": 0.225,
    "lg": 0.3
  };
  
  let scaleFactor = 1;
  
  if (totalBubbles <= 5) {
    scaleFactor = 1.5;
  } else if (totalBubbles <= 10) {
    scaleFactor = 1.3;
  } else if (totalBubbles <= 20) {
    scaleFactor = 1.1;
  } else if (totalBubbles <= 40) {
    scaleFactor = 0.9;
  } else if (totalBubbles <= 60) {
    scaleFactor = 0.7;
  } else {
    scaleFactor = 0.5;
  }
  
  return baseSizeMap[size] * scaleFactor;
};
