import * as THREE from 'three';

/**
 * Creates a bubble geometry based on size
 * @param size Size of the bubble (radius)
 * @returns THREE geometry for the bubble
 */
export const createBubbleGeometry = (size: number): THREE.BufferGeometry => {
  // Use higher segment count for better-looking bubbles
  return new THREE.SphereGeometry(size, 32, 32);
};

/**
 * Creates a bubble material with proper transparency and reflectivity
 * @param color Color of the bubble
 * @returns THREE material for the bubble
 */
export const createBubbleMaterial = (color: THREE.ColorRepresentation = 0xFEF7CD): THREE.Material => {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    emissive: 0xF5DD6C,
    emissiveIntensity: 0.2,
    metalness: 0.05,
    roughness: 0.1,
    transmission: 0.8,
    reflectivity: 0.5,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
};

/**
 * Creates a canvas with centered text for bubble labels
 * @param text Text to display on the bubble
 * @param fontSize Size of the font
 * @returns Canvas element with rendered text
 */
export const createTextCanvas = (text: string, fontSize: number = 40): HTMLCanvasElement => {
  // Create canvas
  const canvas = document.createElement('canvas');
  const size = Math.max(256, fontSize * 3.5); // Adjust canvas size based on font size
  canvas.width = size;
  canvas.height = size / 2;
  
  // Get context
  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not get canvas context');
    return canvas;
  }
  
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Configure text style - no background, just clean text
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Draw text directly, no background
  context.fillStyle = 'rgba(50, 50, 50, 0.9)';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};

/**
 * Calculates dynamic bubble size based on number of bubbles and size category
 * @param totalBubbles Total number of bubbles in the scene
 * @param sizeCategory Size category (sm, md, lg)
 * @returns Calculated size for the bubble
 */
export const calculateDynamicBubbleSize = (totalBubbles: number, sizeCategory: "sm" | "md" | "lg"): number => {
  // Base sizes
  const baseSizes = {
    sm: 0.7,
    md: 1.0,
    lg: 1.3
  };
  
  // Size adjustment based on total bubbles count
  let sizeMultiplier = 1.0;
  
  if (totalBubbles <= 5) {
    // Few bubbles - make them larger
    sizeMultiplier = 1.4;
  } else if (totalBubbles <= 15) {
    // Medium number of bubbles
    sizeMultiplier = 1.2;
  } else if (totalBubbles <= 30) {
    // Many bubbles
    sizeMultiplier = 1.0;
  } else {
    // Lots of bubbles - make them smaller
    sizeMultiplier = 0.8;
  }
  
  return baseSizes[sizeCategory] * sizeMultiplier;
};

/**
 * Get initials from a username or email
 * @param username The username or email to extract initials from
 * @returns String containing the initials (up to 2 characters)
 */
export const getInitials = (username: string): string => {
  if (!username) return '?';
  
  // If it's an email, use the part before @ symbol
  const cleanName = username.includes('@') ? username.split('@')[0] : username;
  
  // For single names, return the first character
  if (!cleanName.includes(' ')) {
    return cleanName.charAt(0).toUpperCase();
  }
  
  // For multiple names, take first char of first and last name
  const parts = cleanName.split(' ').filter(Boolean);
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return `${first}${last}`;
};

/**
 * Connection manager for Supabase realtime channels
 */
export const connectionManager = {
  // Store active channels
  channels: new Map<string, any>(),
  
  /**
   * Create a new realtime channel
   * @param supabase Supabase client instance
   * @param channelName Unique name for the channel
   * @param filters Array of filters for the channel
   * @param callback Function to call when events are received
   */
  createChannel: async (
    supabase: any, 
    channelName: string, 
    filters: Array<{
      event: string;
      schema: string;
      table: string;
      filter?: string;
    }>,
    callback: (payload: any) => void
  ) => {
    try {
      if (connectionManager.channels.has(channelName)) {
        console.log(`Channel ${channelName} already exists, removing first`);
        await connectionManager.removeChannel(supabase, channelName);
      }
      
      let channel = supabase.channel(channelName);
      
      // Add all filters
      filters.forEach(filter => {
        channel = channel.on(
          'postgres_changes',
          filter,
          (payload: any) => {
            callback(payload);
          }
        );
      });
      
      // Subscribe to the channel
      channel = channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to channel: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Channel error for ${channelName}`);
          // Could implement auto-reconnection logic here
        }
      });
      
      // Store in our map
      connectionManager.channels.set(channelName, channel);
      
      return true;
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      return false;
    }
  },
  
  /**
   * Remove a specific channel
   * @param supabase Supabase client instance 
   * @param channelName Name of the channel to remove
   */
  removeChannel: async (supabase: any, channelName: string) => {
    try {
      const channel = connectionManager.channels.get(channelName);
      if (channel) {
        await supabase.removeChannel(channel);
        connectionManager.channels.delete(channelName);
        console.log(`Removed channel: ${channelName}`);
      }
      return true;
    } catch (error) {
      console.error(`Error removing channel ${channelName}:`, error);
      return false;
    }
  },
  
  /**
   * Remove all active channels
   * @param supabase Supabase client instance
   */
  removeAllChannels: async (supabase: any) => {
    try {
      const promises = Array.from(connectionManager.channels.entries()).map(
        async ([name, channel]) => {
          await supabase.removeChannel(channel);
          console.log(`Removed channel: ${name}`);
          return name;
        }
      );
      
      const removedChannels = await Promise.all(promises);
      removedChannels.forEach(name => {
        connectionManager.channels.delete(name);
      });
      
      return true;
    } catch (error) {
      console.error("Error removing all channels:", error);
      return false;
    }
  }
};
