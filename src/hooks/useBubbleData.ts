
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { connectionManager } from "@/utils/bubbleUtils";

// Match the actual database schema for bubbles
interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  size: 'sm' | 'md' | 'lg';
  expires_at: string;
  created_at: string;
  reflect_count: number;
  username: string;
}

// Helper function to ensure size is one of the allowed values
const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  // Default to 'sm' if size is not valid
  return 'sm';
};

const useBubbleData = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [explodingBubbleId, setExplodingBubbleId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Track channel subscriptions for cleanup
  const activeChannels = useState<string[]>([]);

  // Function to check if a bubble is expired (more than 24 hours old)
  const isBubbleExpired = useCallback((bubble: Bubble) => {
    if (!bubble || !bubble.expires_at) return true;
    
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      return expiryTime < now;
    } catch (error) {
      console.error("Error checking bubble expiry:", error);
      return true; // Consider expired on error to prevent issues
    }
  }, []);

  // Fetch all bubbles with optimized caching
  const { data: allBubbles = [], isLoading: isLoadingBubbles, error: bubblesError } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      try {
        // Get the current time minus 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .gte('expires_at', twentyFourHoursAgo.toISOString()) // Only fetch non-expired bubbles
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn("Unexpected data format from bubbles query:", data);
          return [];
        }
        
        // Ensure size is a valid type
        return data.map(bubble => ({
          ...bubble,
          size: validateBubbleSize(bubble.size)
        }));
      } catch (error) {
        console.error("Error fetching bubbles:", error);
        toast({
          title: "Error fetching bubbles",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
        return [];
      }
    },
    staleTime: 10000, // Cache data for 10 seconds
    refetchInterval: 30000, // Periodically refresh every 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Filter out expired bubbles
  const bubbles = useMemo(() => {
    if (!allBubbles || !Array.isArray(allBubbles)) return [];
    return allBubbles.filter(bubble => !isBubbleExpired(bubble));
  }, [allBubbles, isBubbleExpired]);

  // Handle bubble explosion animation and removal
  useEffect(() => {
    const checkForExpiringBubbles = () => {
      bubbles.forEach(bubble => {
        if (!bubble || !bubble.expires_at) return;
        
        try {
          const expiryTime = new Date(bubble.expires_at);
          const now = new Date();
          const timeLeft = expiryTime.getTime() - now.getTime();
          
          // If bubble is about to expire in the next minute, trigger animation
          if (timeLeft > 0 && timeLeft < 60000 && explodingBubbleId !== bubble.id) {
            setExplodingBubbleId(bubble.id);
            
            // After 5 seconds, refresh the bubble list to remove the exploded bubble
            setTimeout(() => {
              setExplodingBubbleId(null);
              queryClient.invalidateQueries({ queryKey: ['bubbles'] });
            }, 5000);
          }
        } catch (error) {
          console.error("Error calculating bubble expiry:", error);
        }
      });
    };
    
    // Check for expiring bubbles every 10 seconds
    const interval = setInterval(checkForExpiringBubbles, 10000);
    
    return () => clearInterval(interval);
  }, [bubbles, explodingBubbleId, queryClient]);

  // Fetch selected bubble details with optimized caching
  const { data: selectedBubble, isLoading: isLoadingBubbleDetails, error: bubbleDetailsError } = useQuery({
    queryKey: ['bubble', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return null;
      
      try {
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .eq('id', selectedBubbleId)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          return null;
        }
        
        // Ensure size is a valid type
        return {
          ...data,
          size: validateBubbleSize(data.size)
        };
      } catch (error) {
        console.error("Error fetching bubble details:", error);
        toast({
          title: "Error fetching bubble details",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
        return null;
      }
    },
    enabled: !!selectedBubbleId,
    staleTime: 10000, // Cache data for 10 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Close chat dialog if selected bubble is expired
  useEffect(() => {
    if (selectedBubble && isBubbleExpired(selectedBubble) && chatOpen) {
      setChatOpen(false);
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available",
        variant: "destructive"
      });
    }
  }, [selectedBubble, chatOpen, toast, isBubbleExpired]);

  // Fetch messages for selected bubble with optimized pagination
  const { data: messages = [], isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];
      
      try {
        const { data, error } = await supabase
          .from('bubble_messages')
          .select('*')
          .eq('bubble_id', selectedBubbleId)
          .order('created_at', { ascending: true })
          .limit(100); // Limit to last 100 messages for performance
        
        if (error) {
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn("Unexpected data format from messages query:", data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error fetching messages",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!selectedBubbleId && chatOpen,
    staleTime: 5000, // Cache data for 5 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

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
        activeChannels[0] = [...activeChannels[0], channelName];
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
      activeChannels[0] = [];
    };
  }, [queryClient, selectedBubbleId, toast, activeChannels]);

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
        activeChannels[0] = [...activeChannels[0], channelName];
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
      const channelsToRemove = activeChannels[0].filter(
        name => name.startsWith(`chat-room-${selectedBubbleId}`)
      );
      
      channelsToRemove.forEach(async (channelName) => {
        await connectionManager.removeChannel(supabase, channelName);
        activeChannels[0] = activeChannels[0].filter(name => name !== channelName);
      });
    };
  }, [selectedBubbleId, queryClient, toast, activeChannels]);

  // Filter bubbles based on search query
  const filteredBubbles = useMemo(() => {
    if (!bubbles || !Array.isArray(bubbles)) return [];
    if (!searchQuery.trim()) return bubbles;
    
    const query = searchQuery.toLowerCase();
    return bubbles.filter((bubble) => 
      bubble.name.toLowerCase().includes(query) || 
      bubble.topic.toLowerCase().includes(query) ||
      (bubble.description && bubble.description.toLowerCase().includes(query))
    );
  }, [bubbles, searchQuery]);

  // Map to BubbleData needed for BubbleWorld component
  const bubbleDataForComponent = useMemo(() => {
    if (!filteredBubbles || !Array.isArray(filteredBubbles)) return [];
    
    return filteredBubbles.map((bubble): BubbleData => ({
      id: bubble.id,
      topic: bubble.topic,
      username: bubble.username,
      name: bubble.name,
      size: bubble.size, // Already validated as "sm" | "md" | "lg"
      reflect_count: bubble.reflect_count,
      created_at: bubble.created_at,
      description: bubble.description || undefined,
      expires_at: bubble.expires_at,
      isExploding: explodingBubbleId === bubble.id
    }));
  }, [filteredBubbles, explodingBubbleId]);

  // Optimized bubble reflection with retry logic
  const handleReflect = useCallback(async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    // Find the bubble to check if it's expired
    const bubble = bubbles.find(b => b.id === bubbleId);
    
    if (!bubble || (bubble && isBubbleExpired(bubble))) {
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available for reflection",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const username = profile?.username || user?.email || "";
      
      const sendRetry = {
        current: async (callback: () => Promise<void>) => {
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              await callback();
              return;
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }
      };
      
      await sendRetry.current(async () => {
        const { error } = await supabase
          .from('reflects')
          .insert({ 
            bubble_id: bubbleId,
            username
          });

        if (error) {
          if (error.code === '23505') { // Unique violation
            toast({
              title: "Already reflected",
              description: "You have already reflected this bubble",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "Bubble reflected!",
          description: "This bubble will appear in your profile",
        });
      });
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [user, profile, bubbles, toast, isBubbleExpired]);

  // Handle bubble click to navigate to bubble chat page
  const handleBubbleClick = useCallback((bubbleId: string) => {
    // Find bubble to check if it's expired
    const bubble = bubbles.find(b => b.id === bubbleId);
    
    if (!bubble || (bubble && isBubbleExpired(bubble))) {
      toast({
        title: "Bubble Expired",
        description: "This bubble has expired and is no longer available",
        variant: "destructive"
      });
      return;
    }
    
    // Navigate to the bubble's chat page
    navigate(`/bubble/${bubbleId}`);
  }, [bubbles, isBubbleExpired, navigate, toast]);

  return {
    bubbles,
    filteredBubbles,
    isLoadingBubbles,
    bubblesError,
    searchQuery,
    setSearchQuery,
    selectedBubbleId,
    setSelectedBubbleId,
    selectedBubble,
    isLoadingBubbleDetails,
    bubbleDetailsError,
    messages,
    isLoadingMessages,
    messagesError,
    chatOpen,
    setChatOpen,
    isReconnecting,
    explodingBubbleId,
    bubbleDataForComponent,
    isBubbleExpired,
    handleReflect,
    handleBubbleClick
  };
};

export default useBubbleData;
