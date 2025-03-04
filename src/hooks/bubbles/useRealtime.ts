
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { connectionManager } from "@/utils/bubbleUtils";

/**
 * Hook for managing realtime updates for bubbles and messages
 */
export const useRealtime = (selectedBubbleId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Track channel subscriptions for cleanup
  const activeChannels = useRef<string[]>([]);

  // Enhanced real-time bubble updates with reconnection logic
  useEffect(() => {
    const setupBubbleChannel = async () => {
      try {
        const channelName = `bubble-updates-${Date.now()}`;
        
        const filters = [
          { event: '*', schema: 'public', table: 'reflects' },
          { event: '*', schema: 'public', table: 'bubbles' }
        ];
        
        await connectionManager.createChannel(
          supabase,
          channelName,
          filters,
          (payload) => {
            // Invalidate bubbles query
            queryClient.invalidateQueries({ queryKey: ['bubbles'] });
            
            // If the current bubble was updated, refresh its details
            if (selectedBubbleId && 
                payload.new && 
                typeof payload.new === 'object' && 
                'id' in payload.new && 
                payload.new.id === selectedBubbleId) {
              queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
            }
          }
        );
        
        // Track this channel for cleanup
        activeChannels.current = [...activeChannels.current, channelName];
        setIsReconnecting(false);
      } catch (err) {
        console.error("Error setting up bubble updates subscription:", err);
        setIsReconnecting(true);
        
        toast({
          title: "Connection Warning",
          description: "Live updates connection lost. Reconnecting...",
          variant: "destructive"
        });
        
        // Try reconnecting after a delay
        setTimeout(setupBubbleChannel, 5000);
      }
    };

    setupBubbleChannel();
    
    // Global cleanup on unmount
    return () => {
      connectionManager.removeAllChannels(supabase);
      activeChannels.current = [];
    };
  }, [queryClient, selectedBubbleId, toast]);

  // Improved real-time message updates
  useEffect(() => {
    if (!selectedBubbleId) return;

    const setupMessageChannel = async () => {
      try {
        // Create a more robust channel name to avoid conflicts
        const channelName = `chat-room-${selectedBubbleId}-${Date.now()}`;
        
        const filters = [
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bubble_messages',
            filter: `bubble_id=eq.${selectedBubbleId}`
          },
          {
            event: 'DELETE',
            schema: 'public',
            table: 'bubble_messages',
            filter: `bubble_id=eq.${selectedBubbleId}`
          }
        ];
        
        await connectionManager.createChannel(
          supabase,
          channelName,
          filters,
          () => queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] })
        );
        
        // Track this channel for cleanup
        activeChannels.current = [...activeChannels.current, channelName];
        setIsReconnecting(false);
      } catch (err) {
        console.error("Error setting up real-time chat subscription:", err);
        setIsReconnecting(true);
        
        toast({
          title: "Connection Error",
          description: "Having trouble connecting to chat. Will retry automatically.",
          variant: "destructive"
        });
        
        // Try reconnecting after a delay
        setTimeout(() => {
          if (selectedBubbleId) {
            setupMessageChannel();
          }
        }, 5000);
      }
    };

    setupMessageChannel();

    return () => {
      // Clean up only the relevant channels
      const channelsToRemove = activeChannels.current.filter(
        name => name.startsWith(`chat-room-${selectedBubbleId}`)
      );
      
      channelsToRemove.forEach(async (channelName) => {
        await connectionManager.removeChannel(supabase, channelName);
        activeChannels.current = activeChannels.current.filter(name => name !== channelName);
      });
    };
  }, [selectedBubbleId, queryClient, toast]);

  // Handle online/offline status for better user experience
  useEffect(() => {
    const handleOnline = () => {
      // Refresh data when coming back online
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      if (selectedBubbleId) {
        queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
        queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
      }
      
      // Show toast notification
      toast({
        title: "You're back online!",
        description: "Reconnected to Bubble Trouble",
        variant: "default"
      });
      
      setIsReconnecting(false);
    };
    
    const handleOffline = () => {
      toast({
        title: "You're offline",
        description: "Waiting for connection to resume",
        variant: "destructive"
      });
      
      setIsReconnecting(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, selectedBubbleId, toast]);

  return {
    isReconnecting
  };
};

export default useRealtime;
