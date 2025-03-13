import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { connectionManager } from "@/utils/bubbleUtils";

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
  latitude: number;
  longitude: number;
}

const validateBubbleSize = (size: string): 'sm' | 'md' | 'lg' => {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
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
  
  const activeChannels = useState<string[]>([]);

  const isBubbleExpired = useCallback((bubble: Bubble) => {
    if (!bubble || !bubble.expires_at) return true;
    
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      return expiryTime < now;
    } catch (error) {
      console.error("Error checking bubble expiry:", error);
      return true;
    }
  }, []);

  const shouldShowInFeed = useCallback((bubble: Bubble) => {
    if (!bubble || !bubble.expires_at) return false;
    
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      
      if (expiryTime > now) return true;
      
      const cutoffTime = new Date(expiryTime);
      cutoffTime.setHours(cutoffTime.getHours() + 24);
      
      return now < cutoffTime;
    } catch (error) {
      console.error("Error checking bubble visibility:", error);
      return false;
    }
  }, []);

  const { data: allBubbles = [], isLoading: isLoadingBubbles, error: bubblesError } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - 48);
        
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .gte('expires_at', cutoffDate.toISOString())
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn("Unexpected data format from bubbles query:", data);
          return [];
        }
        
        return data.map(bubble => ({
          ...bubble,
          size: validateBubbleSize(bubble.size),
          latitude: bubble.latitude ?? (Math.random() * 180) - 90,
          longitude: bubble.longitude ?? (Math.random() * 360) - 180
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
    staleTime: 10000,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const bubbles = useMemo(() => {
    if (!allBubbles || !Array.isArray(allBubbles)) return [];
    return allBubbles.filter(bubble => shouldShowInFeed(bubble));
  }, [allBubbles, shouldShowInFeed]);

  useEffect(() => {
    const checkForExpiringBubbles = () => {
      bubbles.forEach(bubble => {
        if (!bubble || !bubble.expires_at) return;
        
        try {
          const expiryTime = new Date(bubble.expires_at);
          const now = new Date();
          const timeLeft = expiryTime.getTime() - now.getTime();
          
          if (timeLeft > 0 && timeLeft < 60000 && explodingBubbleId !== bubble.id) {
            setExplodingBubbleId(bubble.id);
            
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
    
    const interval = setInterval(checkForExpiringBubbles, 10000);
    
    return () => clearInterval(interval);
  }, [bubbles, explodingBubbleId, queryClient]);

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
    staleTime: 10000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

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
          .limit(100);
        
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
    staleTime: 5000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

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
            queryClient.invalidateQueries({ queryKey: ['bubbles'] });
            
            if (selectedBubbleId && 
                payload.new && 
                typeof payload.new === 'object' && 
                'id' in payload.new && 
                payload.new.id === selectedBubbleId) {
              queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
            }
          }
        );
        
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
        
        setTimeout(setupBubbleChannel, 5000);
      }
    };

    setupBubbleChannel();
    
    return () => {
      connectionManager.removeAllChannels(supabase);
      activeChannels[0] = [];
    };
  }, [queryClient, selectedBubbleId, toast, activeChannels]);

  useEffect(() => {
    const handleOnline = () => {
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      if (selectedBubbleId) {
        queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
        queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
      }
      
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

  useEffect(() => {
    if (!selectedBubbleId) return;

    const setupMessageChannel = async () => {
      try {
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
        
        setTimeout(() => {
          if (selectedBubbleId) {
            setupMessageChannel();
          }
        }, 5000);
      }
    };

    setupMessageChannel();

    return () => {
      const channelsToRemove = activeChannels[0].filter(
        name => name.startsWith(`chat-room-${selectedBubbleId}`)
      );
      
      channelsToRemove.forEach(async (channelName) => {
        await connectionManager.removeChannel(supabase, channelName);
        activeChannels[0] = activeChannels[0].filter(name => name !== channelName);
      });
    };
  }, [selectedBubbleId, queryClient, toast, activeChannels]);

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

  const topBubblesByReflections = useMemo(() => {
    if (!bubbles || !Array.isArray(bubbles)) return [];
    
    const visibleBubbles = bubbles.filter(bubble => shouldShowInFeed(bubble));
    
    return [...visibleBubbles].sort((a, b) => {
      return (b.reflect_count || 0) - (a.reflect_count || 0);
    });
  }, [bubbles, shouldShowInFeed]);

  const bubbleDataForComponent = useMemo(() => {
    if (!filteredBubbles || !Array.isArray(filteredBubbles)) return [];
    
    return filteredBubbles.map((bubble): BubbleData => ({
      id: bubble.id,
      topic: bubble.topic,
      username: bubble.username,
      name: bubble.name,
      size: bubble.size,
      reflect_count: bubble.reflect_count,
      created_at: bubble.created_at,
      description: bubble.description || undefined,
      expires_at: bubble.expires_at,
      isExploding: explodingBubbleId === bubble.id,
      latitude: bubble.latitude,
      longitude: bubble.longitude
    }));
  }, [filteredBubbles, explodingBubbleId]);

  const handleReflect = useCallback(async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
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
          if (error.code === '23505') {
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
        
        queryClient.invalidateQueries({ queryKey: ['myBubbles', profile?.username] });
      });
    } catch (error: any) {
      console.error("Error reflecting bubble:", error);
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [user, profile, bubbles, toast, isBubbleExpired, queryClient]);

  const handleBubbleClick = useCallback((bubbleId: string) => {
    const bubble = bubbles.find(b => b.id === bubbleId);
    
    if (!bubble) {
      toast({
        title: "Bubble Not Found",
        description: "This bubble may have been deleted",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/bubble/${bubbleId}`);
  }, [bubbles, navigate, toast]);

  const refreshBubbles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
    if (selectedBubbleId) {
      queryClient.invalidateQueries({ queryKey: ['bubble', selectedBubbleId] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedBubbleId] });
    }
  }, [queryClient, selectedBubbleId]);

  return {
    bubbles,
    filteredBubbles,
    topBubblesByReflections,
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
    shouldShowInFeed,
    handleReflect,
    handleBubbleClick,
    refreshBubbles
  };
};

export default useBubbleData;
