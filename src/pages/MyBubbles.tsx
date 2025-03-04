
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, Sparkles, User, Loader2, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isClientSide, setIsClientSide] = useState(false);

  // Set isClientSide to true after mount to avoid hydration issues
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Fetch user's reflected bubbles with proper error handling
  const { data: myBubbles = [], isLoading: isLoadingBubbles } = useQuery({
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

  // Add a debug console log to see if we're getting data
  useEffect(() => {
    if (myBubbles && myBubbles.length > 0) {
      console.log("MyBubbles data is available:", myBubbles);
    } else if (!isLoadingBubbles) {
      console.log("No bubbles found or empty bubbles array");
    }
  }, [myBubbles, isLoadingBubbles]);

  // Force a refresh of the bubbles data on mount
  useEffect(() => {
    if (user && profile?.username && isClientSide) {
      // This will trigger a refetch when the component mounts
      console.log("Forcing refetch of bubbles data");
      const fetchBubbles = async () => {
        try {
          const { data: reflects, error: reflectsError } = await supabase
            .from('reflects')
            .select('bubble_id')
            .eq('username', profile.username);
          
          console.log("Direct fetch reflects:", reflects, "Error:", reflectsError);
          
          if (reflects && reflects.length > 0) {
            const bubbleIds = reflects.map(r => r.bubble_id);
            
            const { data: bubbles, error: bubblesError } = await supabase
              .from('bubbles')
              .select('*')
              .in('id', bubbleIds);
            
            console.log("Direct fetch bubbles:", bubbles, "Error:", bubblesError);
          }
        } catch (e) {
          console.error("Error in direct fetch:", e);
        }
      };
      
      fetchBubbles();
    }
  }, [user, profile?.username, isClientSide]);

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold hidden sm:inline text-[#ebbd34]">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
                <input
                  type="search"
                  placeholder="Search your bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-[#ebbd34]/5 text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <span className="font-medium text-[#ebbd34]">
                      {profile?.display_name || user?.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      @{profile?.username || user?.email?.split('@')[0]}
                    </span>
                  </DropdownMenuItem>
                  <Link to="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/">
                    <DropdownMenuItem>
                      <Star className="mr-2 h-4 w-4" />
                      <span>Bubble World</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={signOut}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
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
      </nav>
      
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
                  <h3 className="text-lg font-medium text-[#ebbd34]">No reflected bubbles yet</h3>
                  <p className="text-gray-500 mt-2">Explore the bubble world and reflect on topics that interest you!</p>
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
      </main>
    </div>
  );
};

export default MyBubbles;
