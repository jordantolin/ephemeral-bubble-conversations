
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BubbleData } from '@/types/bubble';
import { createQueryOptions, createRealtimeChannel } from '@/utils/queryUtils';
import { useNetwork } from '@/context/NetworkContext';

/**
 * Custom hook for optimized loading of Bubble World data
 * with improved performance characteristics
 */
export const useOptimizedBubbleWorld = (searchQuery: string = '') => {
  const { isOnline } = useNetwork();
  const [channelState, setChannelState] = useState<{ channel: any | null }>({ channel: null });
  const [explodingBubbleId, setExplodingBubbleId] = useState<string | null>(null);

  // Clean up function for the realtime channel
  const cleanupChannel = useCallback(() => {
    if (channelState.channel) {
      supabase.removeChannel(channelState.channel);
      setChannelState({ channel: null });
    }
  }, [channelState]);

  // Fetch bubbles with optimized query
  const { 
    data: bubbles = [], 
    isLoading,
    error,
    refetch
  } = useQuery(
    createQueryOptions(['optimized-bubbles'], async () => {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 48);
      
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .gte('expires_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data) return [];
      
      return data.map(bubble => ({
        id: bubble.id,
        topic: bubble.topic,
        username: bubble.username,
        name: bubble.name,
        size: validateBubbleSize(bubble.size),
        reflect_count: bubble.reflect_count,
        created_at: bubble.created_at,
        description: bubble.description || undefined,
        expires_at: bubble.expires_at,
        isExploding: false
      }));
    })
  );

  // Filter bubbles based on search query
  const filteredBubbles = searchQuery.trim() 
    ? bubbles.filter((bubble: BubbleData) => 
        bubble.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        bubble.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bubble.description && bubble.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bubbles;

  // Handle realtime updates
  useEffect(() => {
    if (!isOnline) return cleanupChannel();

    const channel = createRealtimeChannel(
      `bubbles-realtime-${Date.now()}`,
      'bubbles',
      '*',
      (payload) => {
        console.log('Bubbles changed:', payload);
        refetch();
      }
    );

    setChannelState({ channel });

    return cleanupChannel;
  }, [isOnline, refetch, cleanupChannel]);

  // Check for expiring bubbles
  useEffect(() => {
    const checkExpiringBubbles = () => {
      bubbles.forEach((bubble: BubbleData) => {
        if (!bubble || !bubble.expires_at) return;
        
        const expiryTime = new Date(bubble.expires_at);
        const now = new Date();
        const timeLeft = expiryTime.getTime() - now.getTime();
        
        if (timeLeft > 0 && timeLeft < 60000 && explodingBubbleId !== bubble.id) {
          setExplodingBubbleId(bubble.id);
          
          setTimeout(() => {
            setExplodingBubbleId(null);
            refetch();
          }, 5000);
        }
      });
    };
    
    const interval = setInterval(checkExpiringBubbles, 10000);
    return () => clearInterval(interval);
  }, [bubbles, explodingBubbleId, refetch]);

  return {
    bubbles: filteredBubbles.map((bubble: BubbleData) => ({
      ...bubble,
      isExploding: bubble.id === explodingBubbleId
    })),
    isLoading,
    error
  };
};

// Helper function to validate bubble size
const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  return 'sm';
};
