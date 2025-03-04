
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
import { motion } from "framer-motion";

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

  // Force a refresh of the bubbles data on mount
  useEffect(() => {
    if (user && profile?.username && isClientSide) {
      // This will trigger a refetch when the component mounts
      console.log("Forcing refetch of bubbles data");
      refetchBubbles();
    }
  }, [user, profile?.username, isClientSide, refetchBubbles]);

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <NavigationBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-12">
        <motion.div 
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#ebbd34] mb-2">My Reflected Bubbles</h1>
              <p className="text-sm text-[#ebbd34]/70 max-w-xl">
                All your reflected bubbles in one place. Revisit conversations and ideas that resonated with you.
              </p>
            </div>
            <Link to="/">
              <Button 
                variant="outline" 
                className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explore Bubbles
              </Button>
            </Link>
          </div>

          {/* Mobile search (shown only on mobile) */}
          <div className="mb-6 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
              <input
                type="search"
                placeholder="Search your bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-white/80 backdrop-blur-sm shadow-sm text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
              />
            </div>
          </div>

          {isLoadingBubbles ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#ebbd34] animate-spin mb-4" />
              <p className="text-[#ebbd34]">Loading your bubbles...</p>
            </div>
          ) : !myBubbles || filteredBubbles.length === 0 ? (
            <motion.div 
              className="text-center py-16 bg-white/80 rounded-3xl shadow-sm backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
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
                  <h3 className="text-lg font-medium text-[#ebbd34]">No reflected bubbles yet</h3>
                  <p className="text-gray-500 mt-2">Explore the bubble world and reflect on topics that interest you!</p>
                  <Link to="/">
                    <Button className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
                      Explore Bubbles
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredBubbles.map((bubble: Bubble, index) => (
                <motion.div
                  key={bubble.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link to={`/bubble/${bubble.id}`}>
                    <Card className={`hover:shadow-md transition-all duration-300 hover:translate-y-[-4px] cursor-pointer h-full bg-white/90 backdrop-blur-sm border-[#ebbd34]/10 ${
                      isBubbleExpired(bubble) ? 'opacity-70' : ''
                    }`}>
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg text-[#ebbd34] pr-2">{bubble.name}</CardTitle>
                          {isBubbleExpired(bubble) && (
                            <Badge className="text-xs bg-red-100 text-red-600 ml-auto shrink-0">
                              Expired
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-1">{bubble.topic}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {bubble.description || "No description"}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="w-full flex justify-between items-center">
                          <Badge variant="outline" className="text-xs bg-[#ebbd34]/5 text-[#ebbd34] border-[#ebbd34]/20">
                            {bubble.reflect_count} reflects
                          </Badge>
                          <div>
                            <span className="text-xs text-gray-400">
                              {isBubbleExpired(bubble) ? "Expired " : "Expires "} 
                              {formatDate(bubble.expires_at)}
                            </span>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default MyBubbles;
