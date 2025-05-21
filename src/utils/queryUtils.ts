
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
  const filterOptions = filter ? { filter } : {};
  
  const channel = supabase.channel(channelName)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...filterOptions
      },
      callback
    )
    .subscribe((status) => {
      console.log(`Channel ${channelName} status: ${status}`);
      
      // Handle reconnection automatically
      if (status === 'CHANNEL_ERROR') {
        console.error(`Channel ${channelName} error, attempting to reconnect...`);
        setTimeout(() => {
          channel.subscribe();
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
      const channel = supabaseClient.channel(channelName);
      
      // Add all the filters
      filters.forEach(filter => {
        channel.on('postgres_changes', filter, callback);
      });
      
      // Subscribe with status handling
      await channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Channel ${channelName} connected successfully`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Channel ${channelName} error, will retry connection`);
          setTimeout(() => channel.subscribe(), 5000);
        } else if (status === 'TIMED_OUT') {
          console.warn(`Channel ${channelName} timed out, will retry connection`);
          setTimeout(() => channel.subscribe(), 3000);
        }
      });
      
      // Store channel reference for cleanup
      connectionManager.channelsByName.set(channelName, channel);
      
      return channel;
    } catch (error) {
      console.error(`Error creating channel ${channelName}:`, error);
      throw error;
    }
  },
  
  removeChannel: async (supabaseClient: any, channelName: string) => {
    const channel = connectionManager.channelsByName.get(channelName);
    if (channel) {
      await supabaseClient.removeChannel(channel);
      connectionManager.channelsByName.delete(channelName);
      console.log(`Channel ${channelName} removed`);
    }
  },
  
  removeAllChannels: async (supabaseClient: any) => {
    const promises = [];
    for (const [name, channel] of connectionManager.channelsByName.entries()) {
      promises.push(supabaseClient.removeChannel(channel));
      console.log(`Removing channel ${name}`);
    }
    await Promise.all(promises);
    connectionManager.channelsByName.clear();
  }
};
