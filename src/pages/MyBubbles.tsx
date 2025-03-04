
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BubbleNavBar from "@/components/bubbles/BubbleNavBar";
import BubblesList from "@/components/bubbles/BubblesList";

interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  reflect_count: number;
  expires_at: string;
  created_at: string;
}

const MyBubbles = () => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isClientSide, setIsClientSide] = useState(false);

  // Set isClientSide to true after mount to avoid hydration issues
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Fetch user's reflected bubbles with proper error handling
  const { data: myBubbles = [], isLoading: isLoadingBubbles, refetch: refetchBubbles } = useQuery({
    queryKey: ['myBubbles', profile?.username],
    queryFn: async () => {
      if (!user || !profile?.username) {
        console.log("No user or username found, skipping fetch");
        return [];
      }

      try {
        console.log("Fetching reflects for username:", profile.username);
        
        // First, get all bubble IDs that the user has reflected on
        const { data: reflects, error: reflectsError } = await supabase
          .from('reflects')
          .select('bubble_id')
          .eq('username', profile.username);
        
        if (reflectsError) {
          console.error("Error fetching reflects:", reflectsError);
          toast({
            title: "Error fetching reflects",
            description: reflectsError.message,
            variant: "destructive"
          });
          return [];
        }

        console.log("Reflects data:", reflects);
        if (!reflects || reflects.length === 0) {
          console.log("No reflects found for user");
          return [];
        }

        // Extract bubble IDs from the reflects
        const bubbleIds = reflects.map(r => r.bubble_id);
        console.log("Fetching bubbles with IDs:", bubbleIds);
        
        // Then fetch the actual bubble data for those IDs
        const { data: bubbles, error: bubblesError } = await supabase
          .from('bubbles')
          .select('*')
          .in('id', bubbleIds);
        
        if (bubblesError) {
          console.error("Error fetching bubbles:", bubblesError);
          toast({
            title: "Error fetching bubbles",
            description: bubblesError.message,
            variant: "destructive"
          });
          return [];
        }

        console.log("Bubbles data received:", bubbles?.length || 0, bubbles);
        return bubbles || [];
      } catch (e) {
        console.error("Unexpected error in myBubbles query:", e);
        toast({
          title: "Error loading bubbles",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!user && !!profile?.username && isClientSide,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refresh every 30 seconds to catch new reflects
    staleTime: 10000 // Consider data fresh for 10 seconds
  });

  // Filter bubbles based on search query
  const filteredBubbles = (myBubbles || []).filter((bubble: Bubble) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      bubble.name.toLowerCase().includes(searchLower) ||
      bubble.topic.toLowerCase().includes(searchLower) ||
      (bubble.description && bubble.description.toLowerCase().includes(searchLower))
    );
  });

  // Check if a bubble is expired
  const isBubbleExpired = (bubble: Bubble) => {
    try {
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      return expiryTime < now;
    } catch (e) {
      console.error("Error checking bubble expiry:", e);
      return true; // Consider expired on error to prevent issues
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
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

  // Force a refresh of the bubbles data on mount and whenever dependencies change
  useEffect(() => {
    if (user && profile?.username && isClientSide) {
      console.log("Forcing refetch of bubbles data");
      // Immediately trigger a refetch when the component mounts
      refetchBubbles();
      
      // Additional direct database query for debugging
      const fetchBubbles = async () => {
        try {
          console.log("Starting direct fetch with username:", profile.username);
          
          // Check if reflects exist for this user
          const { data: reflects, error: reflectsError } = await supabase
            .from('reflects')
            .select('bubble_id')
            .eq('username', profile.username);
          
          console.log("Direct fetch reflects:", reflects, "Error:", reflectsError);
          
          if (reflects && reflects.length > 0) {
            const bubbleIds = reflects.map(r => r.bubble_id);
            console.log("Direct fetch bubble IDs:", bubbleIds);
            
            // Fetch bubbles with these IDs
            const { data: bubbles, error: bubblesError } = await supabase
              .from('bubbles')
              .select('*')
              .in('id', bubbleIds);
            
            console.log("Direct fetch bubbles:", bubbles, "Error:", bubblesError);
          } else {
            console.log("No reflects found in direct fetch");
          }
        } catch (e) {
          console.error("Error in direct fetch:", e);
        }
      };
      
      fetchBubbles();
    }
  }, [user, profile?.username, isClientSide, refetchBubbles]);

  // Add a debug console log to see if we're getting data
  useEffect(() => {
    if (myBubbles && myBubbles.length > 0) {
      console.log("MyBubbles data is available:", myBubbles);
    } else if (!isLoadingBubbles) {
      console.log("No bubbles found or empty bubbles array");
    }
  }, [myBubbles, isLoadingBubbles]);

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <BubbleNavBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#ebbd34]">My Reflected Bubbles</h1>
            <Link to="/">
              <Button 
                variant="outline" 
                className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5"
              >
                Explore More Bubbles
              </Button>
            </Link>
          </div>

          <BubblesList 
            isLoading={isLoadingBubbles}
            bubbles={myBubbles}
            filteredBubbles={filteredBubbles}
            searchQuery={searchQuery}
            formatDate={formatDate}
            isBubbleExpired={isBubbleExpired}
          />
        </div>
      </main>
    </div>
  );
};

export default MyBubbles;
