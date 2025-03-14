
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import BubbleCircle from "@/components/myBubbles/BubbleCircle";
import { BubbleData } from "@/types/bubble";

interface Bubble {
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

const MyBubbles = () => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isClientSide, setIsClientSide] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Set isClientSide to true after mount to avoid hydration issues
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Fetch both user's reflected bubbles and created bubbles with proper error handling
  const { data: myBubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['myBubbles', profile?.username],
    queryFn: async () => {
      if (!user || !profile?.username) {
        console.log("No user or username found, skipping fetch");
        return [];
      }

      try {
        console.log("Fetching bubbles for username:", profile.username);
        
        // Get all bubble IDs that the user has reflected on directly from the reflects table
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

        console.log("Reflects found:", reflects?.length || 0, "with bubble IDs:", reflects?.map(r => r.bubble_id));

        // Get all bubbles created by the user (without time constraint)
        console.log("Fetching bubbles created by user:", profile.username);
        
        const { data: createdBubbles, error: createdBubblesError } = await supabase
          .from('bubbles')
          .select('*')
          .eq('username', profile.username);
        
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
    },
    enabled: !!user && !!profile?.username && isClientSide,
    retry: 5,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    staleTime: 0, // Set stale time to 0 to always fetch fresh data
    refetchOnMount: true, // Always refetch when the component mounts
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refresh every 5 seconds to catch new reflects
  });

  // Filter bubbles based on search query
  const filteredBubbles = Array.isArray(myBubbles) 
    ? myBubbles.filter((bubble: Bubble) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          bubble.name.toLowerCase().includes(searchLower) ||
          bubble.topic.toLowerCase().includes(searchLower) ||
          (bubble.description && bubble.description.toLowerCase().includes(searchLower))
        );
      })
    : [];

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

  // Force a refresh of the bubbles data on mount and every 30 seconds
  useEffect(() => {
    if (user && profile?.username && isClientSide) {
      console.log("Forcing initial refetch of bubbles data");
      queryClient.invalidateQueries({ queryKey: ['myBubbles', profile?.username] });
      
      // Set up periodic refresh
      const intervalId = setInterval(() => {
        console.log("Periodic refetch of bubbles data");
        queryClient.invalidateQueries({ queryKey: ['myBubbles', profile?.username] });
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [user, profile?.username, isClientSide, queryClient]);

  // Debug logging
  useEffect(() => {
    console.log("My Bubbles component rendered with:", {
      userLoggedIn: !!user,
      profileLoaded: !!profile,
      username: profile?.username,
      bubblesLoaded: myBubbles?.length,
      isLoadingBubbles,
      filteredBubblesLength: filteredBubbles.length
    });
  }, [user, profile, myBubbles, isLoadingBubbles, filteredBubbles.length]);

  // Convert Bubble to BubbleData for the BubbleCircle component
  const bubbleDataForCircle: BubbleData[] = Array.isArray(filteredBubbles)
    ? filteredBubbles
      .filter((bubble: Bubble) => !isBubbleExpired(bubble))
      .map((bubble: Bubble) => ({
        id: bubble.id,
        topic: bubble.topic,
        username: bubble.username,
        name: bubble.name,
        size: bubble.size,
        reflect_count: bubble.reflect_count,
        created_at: bubble.created_at,
        description: bubble.description || undefined,
        expires_at: bubble.expires_at
      }))
    : [];

  // Add debugging for bubble circle data
  useEffect(() => {
    console.log("Bubbles for circle:", bubbleDataForCircle.length);
    console.log("Bubble circle data:", JSON.stringify(bubbleDataForCircle));
  }, [bubbleDataForCircle]);

  // Handle bubble click to navigate to the bubble
  const handleBubbleClick = (bubbleId: string) => {
    navigate(`/bubble/${bubbleId}`);
  };

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      {/* Navigation */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-28 pb-16 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <BubbleWorldHeader 
            onCreateBubble={() => {}} 
            showDescription={false}
            showCreateButton={false}
            title="My Reflected & Created Bubbles"
          />
        
          <div className="md:flex justify-between items-center mb-6 mt-8">
            <div></div> {/* Empty div to maintain layout */}
            <Link to="/">
              <Button 
                variant="outline" 
                className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5 w-full md:w-auto"
              >
                Explore More Bubbles
              </Button>
            </Link>
          </div>

          {/* Mobile Search Bar */}
          <div className="mb-6 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
              <input
                type="search"
                placeholder="Search your bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-[#ebbd34]/5 text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
              />
            </div>
          </div>

          {isLoadingBubbles && (!myBubbles || myBubbles.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#ebbd34] animate-spin mb-4" />
              <p className="text-[#ebbd34]">Loading your bubbles...</p>
            </div>
          ) : (
            <div className="h-[600px] mt-8 mb-12">
              {/* Circular bubble display */}
              <BubbleCircle 
                bubbles={bubbleDataForCircle} 
                onBubbleClick={handleBubbleClick}
              />
            </div>
          )}

          {/* Expired bubbles section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-[#ebbd34] mb-4">Expired Bubbles</h2>
            {filteredBubbles.filter((bubble: Bubble) => isBubbleExpired(bubble)).length === 0 ? (
              <div className="text-center py-8 bg-white/60 rounded-xl backdrop-blur-sm">
                <p className="text-gray-500">No expired bubbles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBubbles
                  .filter((bubble: Bubble) => isBubbleExpired(bubble))
                  .map((bubble: Bubble) => (
                    <Link key={bubble.id} to={`/bubble/${bubble.id}`}>
                      <div className="p-4 bg-white/80 rounded-xl border border-[#ebbd34]/10 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-[#ebbd34]">{bubble.name}</h3>
                          <Badge className="bg-red-100 text-red-600 text-xs">Expired</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{bubble.topic}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{formatDate(bubble.expires_at)}</span>
                          <div className="flex items-center">
                            <Star className="w-3 h-3 mr-1 text-[#ebbd34]" />
                            <span>{bubble.reflect_count} reflects</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBubbles;
