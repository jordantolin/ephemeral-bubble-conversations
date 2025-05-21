import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bubble, BubbleMessage, Reflect } from '@/types/bubble';
import { useToast } from '@/hooks/use-toast';

const useBubbleData = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Add these variables to track offline status and retries
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 3;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Bubbles query with improved error handling and retry logic
  const {
    data: bubbles = [],
    isLoading: isLoadingBubbles,
    error: bubblesError,
    refetch: refetchBubbles
  } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Save to local storage for offline access
        if (data && data.length > 0) {
          localStorage.setItem('cached_bubbles', JSON.stringify(data));
        }
        
        // Reset retry count on success
        setRetryCount(0);
        
        console.log('Fetched bubbles:', data?.length);
        return data || [];
      } catch (error) {
        console.error('Error fetching bubbles:', error);
        
        // Attempt to use cached data if available
        const cachedBubbles = localStorage.getItem('cached_bubbles');
        if (cachedBubbles) {
          const parsedBubbles = JSON.parse(cachedBubbles);
          console.log('Using cached bubbles:', parsedBubbles.length);
          return parsedBubbles;
        }
        
        throw error;
      }
    },
    retry: MAX_RETRIES,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Auto-retry logic when connection comes back online
  useEffect(() => {
    if (isOnline && bubblesError && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        setRetryCount(count => count + 1);
        console.log(`Retrying fetch attempt ${retryCount + 1}/${MAX_RETRIES}...`);
        refetchBubbles();
      }, 2000 * (retryCount + 1)); // Increasing backoff
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, bubblesError, retryCount, refetchBubbles]);

  // Show toast on reconnection
  useEffect(() => {
    if (isOnline && retryCount > 0) {
      toast({
        title: "Connection restored",
        description: "Refreshing bubble data...",
      });
    }
  }, [isOnline, retryCount, toast]);
  
  // Add a periodical refresh of the bubbles data
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [queryClient, isOnline]);

  // Track connection status for display
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  useEffect(() => {
    if (!isOnline) {
      setIsReconnecting(true);
    } else {
      // Reset after a delay to allow showing the reconnecting state
      const timer = setTimeout(() => {
        setIsReconnecting(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const {
    data: selectedBubble,
    isLoading: isLoadingBubbleDetails,
  } = useQuery({
    queryKey: ['bubble', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return null;

      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .eq('id', selectedBubbleId)
        .single();

      if (error) throw error;
      return data as Bubble;
    },
    enabled: !!selectedBubbleId,
  });

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];

      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', selectedBubbleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BubbleMessage[];
    },
    enabled: !!selectedBubbleId,
    refetchInterval: 5000,
  });

  const handleBubbleClick = (id: string) => {
    setSelectedBubbleId(id);
    setChatOpen(true);
  };

  const handleReflect = async (bubbleId: string) => {
    try {
      const { error } = await supabase
        .from('reflects')
        .insert({ bubble_id: bubbleId, username: 'testuser' }); // Replace 'testuser' with actual username

      if (error) throw error;

      // Invalidate the bubble query to refetch data
      await queryClient.invalidateQueries({ queryKey: ['bubble', bubbleId] });

      toast({
        title: 'Bubble reflected!',
        description: 'This bubble will appear in your profile page',
      });
    } catch (error: any) {
      toast({
        title: 'Error reflecting bubble',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isBubbleExpired = (bubble: Bubble | null) => {
    if (!bubble) return false;
    return new Date(bubble.expires_at) < new Date();
  };

  // Function to filter bubbles based on search query
  const filteredBubbles = bubbles.filter((bubble) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      bubble.name.toLowerCase().includes(searchTerm) ||
      bubble.topic.toLowerCase().includes(searchTerm)
    );
  });

  // Convert bubbles to the format expected by the BubbleWorld component
  const bubbleDataForComponent = bubbles.map(bubble => ({
    id: bubble.id,
    topic: bubble.topic,
    username: bubble.username,
    name: bubble.name,
    size: bubble.size || 'sm',
    reflect_count: bubble.reflect_count || 0,
    created_at: bubble.created_at,
    description: bubble.description,
    expires_at: bubble.expires_at
  }));

  // Add additional properties for more robust handling in components
  Object.defineProperties(bubbleDataForComponent, {
    _loading: { value: isLoadingBubbles, enumerable: false },
    _error: { value: bubblesError, enumerable: false }
  });

  return {
    searchQuery,
    setSearchQuery,
    selectedBubbleId,
    setSelectedBubbleId,
    selectedBubble,
    isLoadingBubbleDetails,
    messages,
    isLoadingMessages,
    messagesError,
    chatOpen,
    setChatOpen,
    isReconnecting,
    filteredBubbles,
    bubbles,
    isLoadingBubbles,
    bubblesError,
    bubbleDataForComponent,
    isBubbleExpired,
    handleReflect,
    handleBubbleClick
  };
};

export default useBubbleData;
