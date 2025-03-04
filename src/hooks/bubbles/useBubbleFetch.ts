
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bubble } from "./types";
import { validateBubbleSize } from "./utils";

/**
 * Hook for fetching bubble data from Supabase
 */
export const useBubbleFetch = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all bubbles with optimized caching
  const { 
    data: allBubbles = [], 
    isLoading: isLoadingBubbles, 
    error: bubblesError 
  } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      try {
        // Calculate the cutoff date (24 hours after expiration)
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - 48); // Current time minus 48 hours (24h bubble lifetime + 24h after)
        
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .gte('expires_at', cutoffDate.toISOString()) // Only fetch bubbles that aren't more than 24h past expiration
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

  // Function to fetch a specific bubble by ID
  const fetchBubbleById = (bubbleId: string | null) => {
    return useQuery({
      queryKey: ['bubble', bubbleId],
      queryFn: async () => {
        if (!bubbleId) return null;
        
        try {
          const { data, error } = await supabase
            .from('bubbles')
            .select('*')
            .eq('id', bubbleId)
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
      enabled: !!bubbleId,
      staleTime: 10000, // Cache data for 10 seconds
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    });
  };

  // Function to fetch messages for a specific bubble
  const fetchBubbleMessages = (bubbleId: string | null, isEnabled: boolean) => {
    return useQuery({
      queryKey: ['messages', bubbleId],
      queryFn: async () => {
        if (!bubbleId) return [];
        
        try {
          const { data, error } = await supabase
            .from('bubble_messages')
            .select('*')
            .eq('bubble_id', bubbleId)
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
      enabled: !!bubbleId && isEnabled,
      staleTime: 5000, // Cache data for 5 seconds
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    });
  };

  return {
    allBubbles,
    isLoadingBubbles,
    bubblesError,
    fetchBubbleById,
    fetchBubbleMessages,
    invalidateBubbles: () => queryClient.invalidateQueries({ queryKey: ['bubbles'] }),
    invalidateBubble: (bubbleId: string) => queryClient.invalidateQueries({ queryKey: ['bubble', bubbleId] }),
    invalidateMessages: (bubbleId: string) => queryClient.invalidateQueries({ queryKey: ['messages', bubbleId] })
  };
};

export default useBubbleFetch;
