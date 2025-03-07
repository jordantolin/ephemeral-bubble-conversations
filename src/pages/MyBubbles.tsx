
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";

interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  reflect_count: number;
  expires_at: string;
  created_at: string;
  username: string;
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

  // Calculate the cutoff date (72 hours ago)
  const get72HoursAgoDate = () => {
    const date = new Date();
    date.setHours(date.getHours() - 72);
    return date.toISOString();
  };

  // Fetch both user's reflected bubbles and created bubbles with proper error handling
  const { data: myBubbles = [], isLoading: isLoadingBubbles, refetch: refetchBubbles } = useQuery({
    queryKey: ['myBubbles', profile?.username],
    queryFn: async () => {
      if (!user || !profile?.username) {
        console.log("No user or username found, skipping fetch");
        return [];
      }

      try {
        console.log("Fetching bubbles for username:", profile.username);
        
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

        // Get all bubbles created by the user within the last 72 hours
        const cutoffDate = get72HoursAgoDate();
        console.log("Fetching bubbles created after:", cutoffDate);
        
        const { data: createdBubbles, error: createdBubblesError } = await supabase
          .from('bubbles')
          .select('*')
          .eq('username', profile.username)
          .gte('created_at', cutoffDate);
        
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

        // Extract bubble IDs from the reflects
        const bubbleIds = reflects?.map(r => r.bubble_id) || [];
        
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
          }
        }
        
        // Combine reflected and created bubbles, removing duplicates
        const allBubbles = [...reflectedBubbles];
        
        // Add created bubbles if they're not already in the list (from reflects)
        createdBubbles?.forEach(bubble => {
          if (!allBubbles.some(b => b.id === bubble.id)) {
            allBubbles.push(bubble);
          }
        });
        
        console.log("Total bubbles to display:", allBubbles.length);
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

  // Force a refresh of the bubbles data on mount
  useEffect(() => {
    if (user && profile?.username && isClientSide) {
      console.log("Forcing refetch of bubbles data");
      refetchBubbles();
    }
  }, [user, profile?.username, isClientSide, refetchBubbles]);

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      {/* Navigation */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-28 pb-16 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          {/* Header - Using the updated BubbleWorldHeader component with customized props */}
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

          {isLoadingBubbles ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#ebbd34] animate-spin mb-4" />
              <p className="text-[#ebbd34]">Loading your bubbles...</p>
            </div>
          ) : !myBubbles || filteredBubbles.length === 0 ? (
            <div className="text-center py-16 bg-white/60 rounded-3xl shadow-sm backdrop-blur-sm">
              {searchQuery ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
                    <Search className="w-8 h-8 text-[#ebbd34]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#ebbd34]">No matches found</h3>
                  <p className="text-gray-500 mt-2">Try a different search term</p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
                    <Sparkles className="w-8 h-8 text-[#ebbd34]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#ebbd34]">No bubbles yet</h3>
                  <p className="text-gray-500 mt-2">Create a new bubble or reflect on existing ones!</p>
                  <Link to="/">
                    <Button className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
                      Explore Bubbles
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBubbles.map((bubble: Bubble) => (
                <Link key={bubble.id} to={`/bubble/${bubble.id}`}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full bg-white/80 backdrop-blur-sm border-[#ebbd34]/10 ${
                    isBubbleExpired(bubble) ? 'opacity-70' : ''
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-[#ebbd34]">{bubble.name}</CardTitle>
                      <CardDescription>{bubble.topic}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {bubble.description || "No description"}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="w-full flex justify-between items-center">
                        <Badge className="text-xs bg-[#ebbd34]/10 text-[#ebbd34]">
                          {bubble.reflect_count} reflects
                        </Badge>
                        <div className="flex items-center">
                          {isBubbleExpired(bubble) && (
                            <Badge className="mr-2 text-xs bg-red-100 text-red-600">
                              Expired
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            {isBubbleExpired(bubble) ? "Expired on " : "Expires "} 
                            {formatDate(bubble.expires_at)}
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBubbles;
