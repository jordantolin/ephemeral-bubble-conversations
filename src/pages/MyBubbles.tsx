
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import BubbleCircle from "@/components/myBubbles/BubbleCircle";
import MobileSearchBar from "@/components/myBubbles/MobileSearchBar";
import BubblesLoading from "@/components/myBubbles/BubblesLoading";
import ExpiredBubblesList from "@/components/myBubbles/ExpiredBubblesList";
import { BubbleData } from "@/types/bubble";
import { 
  Bubble, 
  formatDate, 
  isBubbleExpired,
  useFetchMyBubbles
} from "@/utils/myBubblesUtils";

const MyBubbles = () => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientSide, setIsClientSide] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Set isClientSide to true after mount to avoid hydration issues
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  const { fetchBubbles } = useFetchMyBubbles(user?.id, profile?.username, isClientSide);

  // Fetch both user's reflected bubbles and created bubbles with proper error handling
  const { data: myBubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['myBubbles', profile?.username],
    queryFn: fetchBubbles,
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

  // Handle bubble click to navigate to the bubble
  const handleBubbleClick = (bubbleId: string) => {
    navigate(`/bubble/${bubbleId}`);
  };

  const handleCreateBubble = () => {
    // Navigate to create bubble page or open create bubble dialog
    navigate('/');
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
            onCreateBubble={handleCreateBubble}
            title="My Reflected & Created Bubbles"
            showDescription={false}
            showCreateButton={true}
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
          <MobileSearchBar 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {isLoadingBubbles && (!myBubbles || myBubbles.length === 0) ? (
            <BubblesLoading />
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
            <ExpiredBubblesList 
              bubbles={filteredBubbles.filter((bubble: Bubble) => isBubbleExpired(bubble))}
              formatDate={formatDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBubbles;
