
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  reflect_count: number;
  expires_at: string;
  created_at: string;
  username: string;
  size: "sm" | "md" | "lg";
}

// Helper functions
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Unknown date";
  }
};

export const isBubbleExpired = (bubble: Bubble): boolean => {
  try {
    const expiryTime = new Date(bubble.expires_at);
    const now = new Date();
    return expiryTime < now;
  } catch (e) {
    console.error("Error checking bubble expiry:", e);
    return true; // Consider expired on error to prevent issues
  }
};

// This custom hook fetches both reflected and created bubbles
export const useFetchMyBubbles = (userId: string | undefined, username: string | undefined, isClientSide: boolean) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchBubbles = async () => {
    if (!userId || !username) {
      console.log("No user or username found, skipping fetch");
      return [];
    }

    try {
      console.log("Fetching bubbles for username:", username);
      
      // Get all bubble IDs that the user has reflected on directly from the reflects table
      const { data: reflects, error: reflectsError } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', username);
      
      if (reflectsError) {
        console.error("Error fetching reflects:", reflectsError);
        toast({
          title: "Error fetching reflects",
          description: reflectsError.message,
          variant: "destructive"
        });
        return [];
      }

      console.log("Reflects found:", reflects?.length || 0, "with bubble IDs:", reflects?.map(r => r.bubble_id));

      // Get all bubbles created by the user (without time constraint)
      console.log("Fetching bubbles created by user:", username);
      
      const { data: createdBubbles, error: createdBubblesError } = await supabase
        .from('bubbles')
        .select('*')
        .eq('username', username);
      
      if (createdBubblesError) {
        console.error("Error fetching created bubbles:", createdBubblesError);
        toast({
          title: "Error fetching created bubbles",
          description: createdBubblesError.message,
          variant: "destructive"
        });
        return [];
      }
      
      console.log("Created bubbles found:", createdBubbles?.length || 0);
      if (createdBubbles?.length > 0) {
        console.log("First created bubble:", createdBubbles[0]);
      }

      // Extract bubble IDs from the reflects
      const bubbleIds = reflects?.map(r => r.bubble_id) || [];
      console.log("Reflected bubble IDs:", bubbleIds);
      
      // If there are reflected bubbles, fetch them
      let reflectedBubbles = [];
      if (bubbleIds.length > 0) {
        const { data: bubbles, error: bubblesError } = await supabase
          .from('bubbles')
          .select('*')
          .in('id', bubbleIds);
        
        if (bubblesError) {
          console.error("Error fetching reflected bubbles:", bubblesError);
          toast({
            title: "Error fetching bubbles",
            description: bubblesError.message,
            variant: "destructive"
          });
        } else {
          reflectedBubbles = bubbles || [];
          console.log("Reflected bubbles fetched:", reflectedBubbles.length);
          if (reflectedBubbles.length > 0) {
            console.log("First reflected bubble:", reflectedBubbles[0]);
          }
        }
      }
      
      // Combine reflected and created bubbles, removing duplicates
      let allBubbles = Array.isArray(reflectedBubbles) ? [...reflectedBubbles] : [];
      
      // Add created bubbles if they're not already in the list (from reflects)
      if (Array.isArray(createdBubbles)) {
        createdBubbles.forEach(bubble => {
          if (!allBubbles.some(b => b.id === bubble.id)) {
            allBubbles.push(bubble);
          }
        });
      }
      
      // Add some debugging to see the actual bubbles data
      console.log("All bubbles to display:", allBubbles.length);
      console.log("All bubbles data:", JSON.stringify(allBubbles));
      
      return allBubbles;
    } catch (e) {
      console.error("Unexpected error in myBubbles query:", e);
      toast({
        title: "Error loading bubbles",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return [];
    }
  };

  return { fetchBubbles };
};
