
import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

/**
 * Optimized query options with common settings
 */
export const createQueryOptions = (key: string[], queryFn: () => Promise<any>) => ({
  queryKey: key,
  queryFn,
  staleTime: 30000, // Data remains fresh for 30 seconds
  retry: (failureCount: number, error: any) => {
    // Don't retry on 404s or auth errors
    if (error?.status === 404 || error?.code === 'PGRST301') return false;
    return failureCount < 3; // Retry up to 3 times for other errors
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
});

/**
 * Creates a realtime subscription channel with better error handling and reconnection
 */
export const createRealtimeChannel = (
  channelName: string, 
  table: string, 
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
  callback: (payload: any) => void,
  filter?: string
) => {
  console.log(`Setting up realtime channel: ${channelName} for ${table} (${event})`);
  
  const filterOptions = filter ? { filter } : {};
  
  const channel = supabase.channel(channelName, { 
    config: { 
      broadcast: { self: false },
      presence: { key: channelName }
    }
  })
  .on(
    'postgres_changes',
    {
      event,
      schema: 'public',
      table,
      ...filterOptions
    },
    (payload) => {
      console.log(`Channel ${channelName} received ${payload.eventType} event:`, payload);
      callback(payload);
    }
  )
  .subscribe((status) => {
    console.log(`Channel ${channelName} status: ${status}`);
    
    // Handle reconnection automatically
    if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn(`Channel ${channelName} status: ${status}, attempting reconnect...`);
      setTimeout(() => {
        try {
          console.log(`Attempting to reconnect channel ${channelName}...`);
          channel.subscribe();
        } catch (err) {
          console.error(`Failed to reconnect channel ${channelName}:`, err);
        }
      }, 5000);
    }
  });
    
  return channel;
};

/**
 * Global query client with optimized settings for the application
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 10000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
      onError: (err) => {
        console.error('Mutation error:', err);
      }
    }
  }
});

/**
 * Manage connection state and recovery
 */
export const connectionManager = {
  channelsByName: new Map<string, any>(),
  
  createChannel: async (
    supabaseClient: any, 
    channelName: string, 
    filters: any[], 
    callback: (payload: any) => void
  ) => {
    try {
      // Ensure unique channel names to prevent conflicts
      const uniqueChannelName = `${channelName}-${Date.now()}`;
      console.log(`Creating new realtime channel: ${uniqueChannelName}`);
      
      // Clean up any existing channel with the same root name
      for (const [name, channel] of connectionManager.channelsByName.entries()) {
        if (name.startsWith(channelName)) {
          console.log(`Found existing channel ${name}, removing before recreation`);
          await supabaseClient.removeChannel(channel);
          connectionManager.channelsByName.delete(name);
        }
      }
      
      const channel = supabaseClient.channel(uniqueChannelName, {
        config: { 
          broadcast: { self: false },
          presence: { key: uniqueChannelName } 
        }
      });
      
      // Add all the filters
      filters.forEach(filter => {
        channel.on('postgres_changes', filter, (payload) => {
          console.log(`Channel ${uniqueChannelName} received event:`, payload.eventType);
          callback(payload);
        });
      });
      
      // Subscribe with better status handling
      channel.subscribe((status: string) => {
        console.log(`Channel ${uniqueChannelName} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`Channel ${uniqueChannelName} connected successfully`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Channel ${uniqueChannelName} status: ${status}, attempting reconnect...`);
          
          // Try reconnecting after a delay
          setTimeout(() => {
            if (connectionManager.channelsByName.has(uniqueChannelName)) {
              console.log(`Attempting to reconnect channel ${uniqueChannelName}...`);
              try {
                channel.subscribe();
              } catch (err) {
                console.error(`Failed to reconnect channel ${uniqueChannelName}:`, err);
              }
            }
          }, 3000 + Math.random() * 2000); // Add jitter to prevent connection storms
        }
      });
      
      // Store channel reference for cleanup
      connectionManager.channelsByName.set(uniqueChannelName, channel);
      
      return channel;
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      throw error;
    }
  },
  
  removeChannel: async (supabaseClient: any, channelName: string) => {
    try {
      console.log(`Attempting to remove channel: ${channelName}`);
      
      const channelsToRemove = [];
      
      // Find all channels that match the name pattern
      for (const [name, channel] of connectionManager.channelsByName.entries()) {
        if (name.startsWith(channelName)) {
          channelsToRemove.push({ name, channel });
        }
      }
      
      if (channelsToRemove.length === 0) {
        console.log(`No channels found matching pattern: ${channelName}`);
        return;
      }
      
      // Remove all matching channels
      for (const { name, channel } of channelsToRemove) {
        try {
          console.log(`Removing channel: ${name}`);
          await supabaseClient.removeChannel(channel);
          connectionManager.channelsByName.delete(name);
          console.log(`Successfully removed channel: ${name}`);
        } catch (e) {
          console.error(`Error removing channel ${name}:`, e);
        }
      }
    } catch (error) {
      console.error(`Error in removeChannel for ${channelName}:`, error);
    }
  },
  
  removeAllChannels: async (supabaseClient: any) => {
    try {
      console.log(`Removing all ${connectionManager.channelsByName.size} active channels`);
      
      const channels = Array.from(connectionManager.channelsByName.entries());
      
      // Process in batches to avoid overwhelming the connection
      const batchSize = 5;
      for (let i = 0; i < channels.length; i += batchSize) {
        const batch = channels.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async ([name, channel]) => {
            try {
              console.log(`Removing channel: ${name}`);
              await supabaseClient.removeChannel(channel);
              connectionManager.channelsByName.delete(name);
              console.log(`Successfully removed channel: ${name}`);
            } catch (e) {
              console.error(`Error removing channel ${name}:`, e);
            }
          })
        );
        
        // Small delay between batches
        if (i + batchSize < channels.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log("All channels removed");
    } catch (err) {
      console.error("Error removing all channels:", err);
    }
  }
};
