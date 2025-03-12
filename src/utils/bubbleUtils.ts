
import * as THREE from 'three';

// Create bubble geometry with customizable size
export const createBubbleGeometry = (size: number = 1) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

// Create bubble material with translucent, shiny appearance
export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,       // Gold color for bubbles
    metalness: 0.2,
    roughness: 0.3,
    transmission: 0.6,     // Make it somewhat transparent
    thickness: 0.5,        // Refraction thickness
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.8
  });
};

// Create central world geometry
export const createCentralWorldGeometry = () => {
  return new THREE.SphereGeometry(1, 64, 64);
};

// Create central world material
export const createCentralWorldMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    metalness: 0.3,
    roughness: 0.4,
    transmission: 0.2,
    clearcoat: 0.8,
    emissive: 0xebbd34,
    emissiveIntensity: 0.2
  });
};

// Create text canvas for labels
export const createTextCanvas = (text: string, fontSize: number = 32) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) return canvas;
  
  // Set canvas size
  canvas.width = 256;
  canvas.height = 128;
  
  // Clear background
  context.fillStyle = 'rgba(0,0,0,0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add shadow for better visibility
  context.shadowColor = 'rgba(0,0,0,0.5)';
  context.shadowBlur = 4;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  
  // Draw text with gold fill
  context.fillStyle = '#ebbd34';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};

// Manage realtime channel connections
export const connectionManager = {
  channels: {} as Record<string, any>,
  
  createChannel: async (supabase: any, channelName: string, filters: any[], callback: (payload: any) => void) => {
    try {
      // Create channel with filters
      const channel = supabase.channel(channelName);
      
      // Add all filters
      filters.forEach(filter => {
        channel.on(
          'postgres_changes',
          filter,
          (payload: any) => callback(payload)
        );
      });
      
      // Subscribe to the channel
      await channel.subscribe();
      
      // Store channel reference
      connectionManager.channels[channelName] = channel;
      
      return channelName;
    } catch (error) {
      console.error('Error creating realtime channel:', error);
      throw error;
    }
  },
  
  removeChannel: async (supabase: any, channelName: string) => {
    try {
      const channel = connectionManager.channels[channelName];
      if (channel) {
        await channel.unsubscribe();
        delete connectionManager.channels[channelName];
      }
    } catch (error) {
      console.error('Error removing channel:', error);
    }
  },
  
  removeAllChannels: async (supabase: any) => {
    try {
      const channelNames = Object.keys(connectionManager.channels);
      await Promise.all(channelNames.map(name => 
        connectionManager.removeChannel(supabase, name)
      ));
    } catch (error) {
      console.error('Error removing all channels:', error);
    }
  }
};
